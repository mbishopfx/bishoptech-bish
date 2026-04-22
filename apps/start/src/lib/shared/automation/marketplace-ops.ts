export type MarketplaceBacklogStatus = 'planned' | 'in_progress' | 'done'

export type MarketplaceBacklogItem = {
  readonly pluginKey: string
  readonly title: string
  readonly status: MarketplaceBacklogStatus
  readonly routeHref: string
  readonly valueHypothesis: string
  readonly acceptanceChecklist: readonly string[]
}

export type MarketplaceBacklogManifest = {
  readonly version: number
  readonly updatedAt: string
  readonly items: readonly MarketplaceBacklogItem[]
}

export type MarketplaceBacklogSelection = {
  readonly item: MarketplaceBacklogItem
  readonly reason: 'resume' | 'next'
  readonly branchName: string
}

export type DirtyBaselineDiff = {
  readonly baseline: readonly string[]
  readonly current: readonly string[]
  readonly unexpected: readonly string[]
  readonly resolved: readonly string[]
}

/**
 * Marketplace feature branches need a stable naming rule so both cron
 * automations and human operators can infer the same in-progress branch from
 * the backlog manifest without consulting git history.
 */
export function branchNameForPluginKey(pluginKey: string) {
  return `codex/marketplace-${pluginKey}`
}

/**
 * The builder always resumes the first unfinished plugin before starting a new
 * one. This keeps the marketplace lane additive and prevents the automation
 * from opening multiple half-built features at once.
 */
export function selectMarketplaceBacklogItem(
  manifest: MarketplaceBacklogManifest,
): MarketplaceBacklogSelection | null {
  const resumable = manifest.items.find((item) => item.status === 'in_progress')
  if (resumable) {
    return {
      item: resumable,
      reason: 'resume',
      branchName: branchNameForPluginKey(resumable.pluginKey),
    }
  }

  const next = manifest.items.find((item) => item.status === 'planned')
  if (!next) {
    return null
  }

  return {
    item: next,
    reason: 'next',
    branchName: branchNameForPluginKey(next.pluginKey),
  }
}

/**
 * Dirty-baseline comparison is string-based on top of `git status --short`
 * lines. The automation only blocks on new drift; existing unrelated files are
 * tolerated until an operator explicitly cleans them up.
 */
export function diffDirtyBaseline(input: {
  baseline: readonly string[]
  current: readonly string[]
}): DirtyBaselineDiff {
  const baselineSet = new Set(input.baseline)
  const currentSet = new Set(input.current)

  return {
    baseline: [...input.baseline],
    current: [...input.current],
    unexpected: input.current.filter((entry) => !baselineSet.has(entry)),
    resolved: input.baseline.filter((entry) => !currentSet.has(entry)),
  }
}

/**
 * Nightly cleanup only touches merged `codex/*` branches. The active branch and
 * any branch tied to the current in-progress marketplace feature remain
 * protected even when they are technically merged.
 */
export function selectMergedCodexBranchesForDeletion(input: {
  mergedBranches: readonly string[]
  currentBranch: string
  inProgressBranch?: string | null
}): string[] {
  return input.mergedBranches.filter((branch) => {
    if (!branch.startsWith('codex/')) return false
    if (branch === input.currentBranch) return false
    if (input.inProgressBranch && branch === input.inProgressBranch) return false
    return true
  })
}
