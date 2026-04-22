#!/usr/bin/env bun

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { diffDirtyBaseline } from '../../apps/start/src/lib/shared/automation/marketplace-ops'

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv
  const flags: Record<string, string> = {}
  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index]
    if (!current?.startsWith('--')) continue
    const key = current.slice(2)
    const value = rest[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    flags[key] = value
    index += 1
  }
  return { command, flags }
}

function readCurrentDirtyState() {
  const raw = execFileSync('git', ['status', '--short'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim()

  return raw.length === 0
    ? []
    : raw
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
}

const { command, flags } = parseArgs(process.argv.slice(2))
const baselinePath = path.resolve(flags.baseline)

if (command === 'capture') {
  const current = readCurrentDirtyState()
  mkdirSync(path.dirname(baselinePath), { recursive: true })
  writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        entries: current,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  console.log(JSON.stringify({ ok: true, current }, null, 2))
  process.exit(0)
}

if (command === 'check') {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as {
    entries: string[]
  }
  const current = readCurrentDirtyState()
  console.log(
    JSON.stringify(
      diffDirtyBaseline({
        baseline: baseline.entries,
        current,
      }),
      null,
      2,
    ),
  )
  process.exit(0)
}

throw new Error(`Unsupported command: ${command ?? '<missing>'}`)
