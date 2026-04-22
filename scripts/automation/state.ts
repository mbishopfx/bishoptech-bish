#!/usr/bin/env bun

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

type AutomationState = {
  readonly version: number
  readonly currentFeatureKey: string | null
  readonly currentBranch: string | null
  readonly slackChannelId: string
  readonly mattQaEmail: string
  readonly updatedAt: string
}

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

function readState(statePath: string): AutomationState {
  return JSON.parse(readFileSync(statePath, 'utf8')) as AutomationState
}

function writeState(statePath: string, state: AutomationState) {
  mkdirSync(path.dirname(statePath), { recursive: true })
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

const { command, flags } = parseArgs(process.argv.slice(2))
const statePath = path.resolve(flags.state)

if (command === 'show') {
  console.log(readFileSync(statePath, 'utf8'))
  process.exit(0)
}

if (command === 'set-current') {
  const currentFeatureKey = flags['feature-key']?.trim()
  const currentBranch = flags.branch?.trim()
  if (!currentFeatureKey || !currentBranch) {
    throw new Error('set-current requires --feature-key and --branch')
  }

  const previous = readState(statePath)
  writeState(statePath, {
    ...previous,
    currentFeatureKey,
    currentBranch,
    updatedAt: new Date().toISOString(),
  })
  process.exit(0)
}

if (command === 'clear-current') {
  const previous = readState(statePath)
  writeState(statePath, {
    ...previous,
    currentFeatureKey: null,
    currentBranch: null,
    updatedAt: new Date().toISOString(),
  })
  process.exit(0)
}

throw new Error(`Unsupported command: ${command ?? '<missing>'}`)
