#!/usr/bin/env bun

import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import type { MarketplaceBacklogManifest } from '../../apps/start/src/lib/shared/automation/marketplace-ops'
import {
  branchNameForPluginKey,
  diffDirtyBaseline,
  selectMergedCodexBranchesForDeletion,
} from '../../apps/start/src/lib/shared/automation/marketplace-ops'

function parseArgs(argv: string[]) {
  const flags: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (!current?.startsWith('--')) continue
    const key = current.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }
    flags[key] = value
    index += 1
  }
  return flags
}

function git(args: string[]) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim()
}

function currentDirtyState() {
  const raw = git(['status', '--short'])
  return raw.length === 0
    ? []
    : raw
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
}

const flags = parseArgs(process.argv.slice(2))
const manifestPath = path.resolve(flags.manifest)
const baselinePath = path.resolve(flags.baseline)
const apply = flags.apply !== 'false'

git(['fetch', '--prune', 'origin'])

const manifest = JSON.parse(
  readFileSync(manifestPath, 'utf8'),
) as MarketplaceBacklogManifest
const inProgress = manifest.items.find((item) => item.status === 'in_progress')
const inProgressBranch = inProgress
  ? branchNameForPluginKey(inProgress.pluginKey)
  : null
const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
const mergedBranchesRaw = git(['branch', '--format', '%(refname:short)', '--merged', 'origin/main'])
const mergedBranches =
  mergedBranchesRaw.length === 0
    ? []
    : mergedBranchesRaw.split('\n').map((line) => line.trim()).filter(Boolean)
const deletableBranches = selectMergedCodexBranchesForDeletion({
  mergedBranches,
  currentBranch,
  inProgressBranch,
})

const deletedBranches: string[] = []
if (apply) {
  for (const branch of deletableBranches) {
    git(['branch', '-d', branch])
    deletedBranches.push(branch)
  }
}

const removedMachineJunk: string[] = []
const dsStoreRaw = execFileSync('find', ['.', '-name', '.DS_Store', '-print'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim()
if (dsStoreRaw.length > 0) {
  for (const relativePath of dsStoreRaw.split('\n').filter(Boolean)) {
    if (apply) {
      rmSync(path.resolve(process.cwd(), relativePath), { force: true })
    }
    removedMachineJunk.push(relativePath)
  }
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as {
  entries: string[]
}
const dirtyDiff = diffDirtyBaseline({
  baseline: baseline.entries,
  current: currentDirtyState(),
})

console.log(
  JSON.stringify(
    {
      currentBranch,
      inProgressBranch,
      deletedBranches: apply ? deletedBranches : deletableBranches,
      removedMachineJunk,
      dirtyDiff,
      cleanBeyondBaseline: dirtyDiff.unexpected.length === 0,
      apply,
    },
    null,
    2,
  ),
)
