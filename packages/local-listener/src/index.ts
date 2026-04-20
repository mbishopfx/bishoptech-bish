import { createServer, type IncomingMessage } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import {
  verifyLocalListenerSignature,
  type LocalListenerActivityPayload,
  type LocalListenerArtifactPayload,
  type LocalListenerHandoffPayload,
  type LocalListenerRegistrationPayload,
  type LocalListenerTarget,
} from '@bish/automation/handoff'

const execFileAsync = promisify(execFile)
function readEnv(...names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) {
      return value
    }
  }
  return undefined
}

const port = Number(readEnv('BISH_LISTENER_PORT') ?? 4343)
const baseUrl = process.env.BISH_BASE_URL?.trim()
const listenerSecret = process.env.BISH_LISTENER_SECRET?.trim()
const tunnelUrl = process.env.BISH_TUNNEL_URL?.trim()
const outputDir = readEnv('BISH_LISTENER_OUTPUT_DIR', 'BISH_OUTPUT_DIR')
  || join(homedir(), 'BISH', 'listener-handoffs')
const workspaceDir =
  readEnv('BISH_LISTENER_WORKSPACE_DIR', 'BISH_WORKSPACE_DIR') || process.cwd()
const runtimeMode = (readEnv('BISH_LISTENER_RUNTIME_MODE', 'BISH_RUNTIME_MODE')
  || (process.platform === 'darwin' ? 'visible' : 'headless')) as
  | 'visible'
  | 'headless'
const defaultTarget = (
  readEnv('BISH_LISTENER_DEFAULT_TARGET') || 'gemini'
) as LocalListenerTarget
const supportedTargets = (
  readEnv('BISH_LISTENER_SUPPORTED_TARGETS', 'BISH_SUPPORTED_TARGETS')
  || 'gemini,codex'
)
  .split(',')
  .map((value) => value.trim())
  .filter((value): value is LocalListenerTarget => value === 'gemini' || value === 'codex')

const replayCache = new Map<string, number>()

if (!baseUrl || !listenerSecret || !tunnelUrl) {
  throw new Error(
    'BISH_BASE_URL, BISH_LISTENER_SECRET, and BISH_TUNNEL_URL are required.',
  )
}

const validatedBaseUrl = baseUrl
const validatedListenerSecret = listenerSecret
const validatedTunnelUrl = tunnelUrl
const callbackUrl = `${validatedBaseUrl}/api/bish/listener/artifacts`
const activityUrl = `${validatedBaseUrl}/api/bish/listener/activity`
const registerUrl = `${validatedBaseUrl}/api/bish/listener/register`

function sanitizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'handoff'
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

async function postArtifactCallback(payload: LocalListenerArtifactPayload) {
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bish-listener-secret': validatedListenerSecret,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const text = await response.text()
    console.error('artifact callback failed', text)
  }
}

async function postActivityCallback(payload: LocalListenerActivityPayload) {
  const response = await fetch(activityUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bish-listener-secret': validatedListenerSecret,
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const text = await response.text()
    console.error('activity callback failed', text)
  }
}

async function collectRepoMetadata() {
  if (!existsSync(workspaceDir)) {
    return {
      repoUrl: null,
      repoBranch: null,
      repoCommitSha: null,
      artifacts: [] as LocalListenerArtifactPayload['artifacts'],
    }
  }

  let repoUrl: string | null = null
  let repoBranch: string | null = null
  let repoCommitSha: string | null = null

  try {
    repoUrl = (await execFileAsync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: workspaceDir,
    })).stdout.trim() || null
    repoBranch = (await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: workspaceDir,
    })).stdout.trim() || null
    repoCommitSha = (await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceDir,
    })).stdout.trim() || null
  } catch {
    // Git metadata is optional; listener installs can point at non-repo folders.
  }

  const artifacts: Array<
    NonNullable<LocalListenerArtifactPayload['artifacts']>[number]
  > = []
  const readmePath = ['README.md', 'readme.md']
    .map((candidate) => join(workspaceDir, candidate))
    .find((candidate) => existsSync(candidate))
  if (readmePath) {
    artifacts.push({
      artifactType: 'readme',
      displayName: 'workspace-readme',
      contentMarkdown: await readFile(readmePath, 'utf8'),
      metadata: {
        absolutePath: readmePath,
      },
    })
  }

  return {
    repoUrl,
    repoBranch,
    repoCommitSha,
    artifacts,
  }
}

function buildPromptMessage(input: {
  readonly systemPrompt: string
  readonly markdownPath: string
  readonly activityHelperPath: string
}) {
  return [
    input.systemPrompt,
    '',
    `Handoff markdown: ${input.markdownPath}`,
    `Activity helper: ${input.activityHelperPath}`,
    '',
    'If you need human help or want to report progress back to BISH, run one of these commands from the shell session:',
    `${input.activityHelperPath} info "Started implementation work"`,
    `${input.activityHelperPath} input_required "Need an environment variable or approval"`,
    `${input.activityHelperPath} resolved "Unblocked and continuing"`,
  ].join('\n')
}

async function writeActivityHelperScript(input: {
  readonly handoffId: string
}) {
  const helperDir = join(outputDir, '.bish-listener')
  const helperPath = join(helperDir, `bish-activity-${input.handoffId}.sh`)
  await mkdir(helperDir, { recursive: true })
  await writeFile(
    helperPath,
    `#!/usr/bin/env bash
set -euo pipefail

KIND="\${1:-info}"
shift || true
MESSAGE="\${*:-}"

if [[ -z "\${MESSAGE}" ]]; then
  echo "Usage: $(basename "$0") <info|warning|input_required|resolved> <message>"
  exit 1
fi

bun -e '
const [kind, message, url, secret, handoffId] = process.argv.slice(1)
const payload = JSON.stringify({ handoffId, kind, message })
fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-bish-listener-secret": secret,
  },
  body: payload,
}).then(async (response) => {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || \`HTTP \${response.status}\`)
  }
  console.log("BISH activity sent")
}).catch((error) => {
  console.error("BISH activity failed", error instanceof Error ? error.message : String(error))
  process.exit(1)
})
' "\${KIND}" "\${MESSAGE}" "${activityUrl}" "${validatedListenerSecret}" "${input.handoffId}"
`,
    'utf8',
  )
  await execFileAsync('chmod', ['+x', helperPath])
  return helperPath
}

async function launchVisibleMacos(input: {
  readonly target: LocalListenerTarget
  readonly prompt: string
}) {
  const command =
    input.target === 'gemini'
      ? 'gemini --yolo'
      : 'codex --dangerously-bypass-approvals-and-sandbox'
  const escapedWorkspace = workspaceDir.replace(/"/g, '\\"')
  await execFileAsync('osascript', [
    '-e',
    `tell application "Terminal" to do script "cd \\"${escapedWorkspace}\\" && ${command}"`,
  ])

  const escapedPrompt = input.prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  await execFileAsync('osascript', [
    '-e',
    'delay 15',
    '-e',
    'tell application "Terminal" to activate',
    '-e',
    `tell application "System Events" to keystroke "${escapedPrompt}"`,
    '-e',
    'tell application "System Events" to key code 36',
  ])
}

async function launchHeadless(input: {
  readonly target: LocalListenerTarget
  readonly prompt: string
}) {
  const command = input.target === 'gemini' ? 'gemini' : 'codex'
  const args =
    input.target === 'gemini'
      ? ['--yolo']
      : ['--dangerously-bypass-approvals-and-sandbox']
  const child = spawn(command, args, {
    cwd: workspaceDir,
    stdio: ['pipe', 'inherit', 'inherit'],
  })

  setTimeout(() => {
    child.stdin.write(`${input.prompt}\n`)
  }, 15_000)

  return new Promise<'completed' | 'failed'>((resolve) => {
    child.on('exit', (code) => {
      resolve(code === 0 ? 'completed' : 'failed')
    })
    child.on('error', () => {
      resolve('failed')
    })
  })
}

async function executeHandoff(payload: LocalListenerHandoffPayload) {
  await mkdir(outputDir, { recursive: true })
  const filePath = join(
    outputDir,
    `${Date.now()}-${sanitizeSlug(payload.title)}.md`,
  )
  await writeFile(filePath, payload.handoffMarkdown, 'utf8')
  const activityHelperPath = await writeActivityHelperScript({
    handoffId: payload.handoffId,
  })

  const prompt = buildPromptMessage({
    systemPrompt: payload.systemPrompt,
    markdownPath: filePath,
    activityHelperPath,
  })

  await postArtifactCallback({
    handoffId: payload.handoffId,
    status: 'received',
    metadata: {
      localFilePath: filePath,
      target: payload.target,
    },
  })
  await postActivityCallback({
    handoffId: payload.handoffId,
    kind: 'info',
    message: 'Listener received the handoff and wrote the markdown package locally.',
    metadata: {
      localFilePath: filePath,
      activityHelperPath,
    },
  })

  const repo = await collectRepoMetadata()
  await postArtifactCallback({
    handoffId: payload.handoffId,
    status: 'running',
    repoUrl: repo.repoUrl,
    repoBranch: repo.repoBranch,
    repoCommitSha: repo.repoCommitSha,
    artifacts: repo.artifacts,
    metadata: {
      localFilePath: filePath,
      runtimeMode,
      workspaceDir,
    },
  })
  await postActivityCallback({
    handoffId: payload.handoffId,
    kind: 'info',
    message:
      runtimeMode === 'visible' && process.platform === 'darwin'
        ? 'Launching an interactive terminal session for this handoff.'
        : 'Launching a headless listener session for this handoff.',
    metadata: {
      runtimeMode,
      workspaceDir,
      activityHelperPath,
    },
  })

  if (runtimeMode === 'visible' && process.platform === 'darwin') {
    await launchVisibleMacos({
      target: payload.target,
      prompt,
    })
    await postActivityCallback({
      handoffId: payload.handoffId,
      kind: 'info',
      message:
        'Interactive terminal handoff launched. Use the activity helper if you need human input or want to post progress updates back to BISH.',
      metadata: {
        activityHelperPath,
      },
    })
    return
  }

  const status = await launchHeadless({
    target: payload.target,
    prompt,
  })
  await postArtifactCallback({
    handoffId: payload.handoffId,
    status,
    repoUrl: repo.repoUrl,
    repoBranch: repo.repoBranch,
    repoCommitSha: repo.repoCommitSha,
    metadata: {
      localFilePath: filePath,
      runtimeMode,
      workspaceDir,
    },
  })
  await postActivityCallback({
    handoffId: payload.handoffId,
    kind: status === 'completed' ? 'resolved' : 'warning',
    message:
      status === 'completed'
        ? 'Headless listener session completed.'
        : 'Headless listener session exited with a failure status.',
    metadata: {
      runtimeMode,
      activityHelperPath,
    },
  })
}

async function registerListener() {
  const payload: LocalListenerRegistrationPayload = {
    endpointUrl: validatedTunnelUrl,
    platform: process.platform === 'darwin' ? 'macos' : 'linux',
    runtimeMode,
    supportedTargets,
    tunnelProvider: validatedTunnelUrl.includes('ngrok') ? 'ngrok' : 'custom',
    metadata: {
      workspaceDir,
      outputDir,
      defaultTarget,
    },
  }

  const response = await fetch(registerUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bish-listener-secret': validatedListenerSecret,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to register listener: ${text}`)
  }
}

function cacheReplayKey(payload: LocalListenerHandoffPayload) {
  replayCache.set(payload.handoffId, Date.now())
  for (const [key, timestamp] of replayCache.entries()) {
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      replayCache.delete(key)
    }
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/handoff') {
    response.statusCode = 404
    response.end('Not found')
    return
  }

  try {
    const timestamp = request.headers['x-bish-timestamp']
    const signature = request.headers['x-bish-signature']
    if (typeof timestamp !== 'string' || typeof signature !== 'string') {
      response.statusCode = 401
      response.end('Missing signature headers')
      return
    }

    if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
      response.statusCode = 401
      response.end('Stale signature timestamp')
      return
    }

    const body = await readBody(request)
    if (
      !verifyLocalListenerSignature({
        secret: validatedListenerSecret,
        timestamp,
        body,
        signature,
      })
    ) {
      response.statusCode = 401
      response.end('Invalid signature')
      return
    }

    const payload = JSON.parse(body) as LocalListenerHandoffPayload
    if (replayCache.has(payload.handoffId)) {
      response.statusCode = 409
      response.end('Replay detected')
      return
    }
    cacheReplayKey(payload)

    response.statusCode = 202
    response.end('Accepted')
    void executeHandoff(payload).catch(async (error) => {
      console.error('handoff execution failed', error)
      await postActivityCallback({
        handoffId: payload.handoffId,
        kind: 'warning',
        message:
          error instanceof Error ? error.message : 'Unexpected handoff failure.',
      })
      await postArtifactCallback({
        handoffId: payload.handoffId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    })
  } catch (error) {
    response.statusCode = 500
    response.end(error instanceof Error ? error.message : 'Unexpected error')
  }
})

server.listen(port, async () => {
  console.log(`BISH local listener listening on http://127.0.0.1:${port}/handoff`)
  try {
    await registerListener()
    console.log('BISH local listener registered successfully')
  } catch (error) {
    console.error('listener registration failed', error)
  }
})
