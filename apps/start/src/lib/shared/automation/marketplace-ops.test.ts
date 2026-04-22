import { describe, expect, it } from 'vitest'
import {
  branchNameForPluginKey,
  diffDirtyBaseline,
  selectMarketplaceBacklogItem,
  selectMergedCodexBranchesForDeletion,
  type MarketplaceBacklogManifest,
} from './marketplace-ops'

describe('marketplace automation helpers', () => {
  it('resumes the current in-progress backlog item before planned work', () => {
    const manifest: MarketplaceBacklogManifest = {
      version: 1,
      updatedAt: '2026-04-22T00:00:00.000Z',
      items: [
        {
          pluginKey: 'playbooks',
          title: 'Playbooks',
          status: 'in_progress',
          routeHref: '/playbooks',
          valueHypothesis: 'Reusable SOP workflows',
          acceptanceChecklist: ['Done'],
        },
        {
          pluginKey: 'proposal_builder',
          title: 'Proposal Builder',
          status: 'planned',
          routeHref: '/proposals',
          valueHypothesis: 'Sales output',
          acceptanceChecklist: ['Done'],
        },
      ],
    }

    expect(selectMarketplaceBacklogItem(manifest)).toEqual({
      item: manifest.items[0],
      reason: 'resume',
      branchName: 'codex/marketplace-playbooks',
    })
  })

  it('selects the next planned item when nothing is in progress', () => {
    const manifest: MarketplaceBacklogManifest = {
      version: 1,
      updatedAt: '2026-04-22T00:00:00.000Z',
      items: [
        {
          pluginKey: 'playbooks',
          title: 'Playbooks',
          status: 'done',
          routeHref: '/playbooks',
          valueHypothesis: 'Reusable SOP workflows',
          acceptanceChecklist: ['Done'],
        },
        {
          pluginKey: 'proposal_builder',
          title: 'Proposal Builder',
          status: 'planned',
          routeHref: '/proposals',
          valueHypothesis: 'Sales output',
          acceptanceChecklist: ['Done'],
        },
      ],
    }

    expect(selectMarketplaceBacklogItem(manifest)).toEqual({
      item: manifest.items[1],
      reason: 'next',
      branchName: 'codex/marketplace-proposal_builder',
    })
  })

  it('computes dirty baseline drift without treating resolved files as blockers', () => {
    expect(
      diffDirtyBaseline({
        baseline: [' M apps/worker/src/index.ts', '?? docs/old.md'],
        current: [' M apps/worker/src/index.ts', '?? docs/new.md'],
      }),
    ).toEqual({
      baseline: [' M apps/worker/src/index.ts', '?? docs/old.md'],
      current: [' M apps/worker/src/index.ts', '?? docs/new.md'],
      unexpected: ['?? docs/new.md'],
      resolved: ['?? docs/old.md'],
    })
  })

  it('only deletes merged codex branches that are not protected', () => {
    expect(
      selectMergedCodexBranchesForDeletion({
        mergedBranches: [
          'main',
          'codex/marketplace-playbooks',
          'codex/old-fix',
          'feature/manual-work',
        ],
        currentBranch: 'main',
        inProgressBranch: 'codex/marketplace-playbooks',
      }),
    ).toEqual(['codex/old-fix'])
  })

  it('builds a stable marketplace branch name', () => {
    expect(branchNameForPluginKey('asset_library')).toBe(
      'codex/marketplace-asset_library',
    )
  })
})
