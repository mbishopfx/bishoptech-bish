import { describe, expect, it } from 'vitest'
import {
  createPlaybookInput,
  getArch3rPluginDefinition,
  updatePlaybookInput,
} from './workspace-tools'

describe('workspace tools shared contract', () => {
  it('defines playbooks as an addon-gated operations plugin', () => {
    expect(getArch3rPluginDefinition('playbooks')).toMatchObject({
      routeHref: '/playbooks',
      entitlementMode: 'addon',
      category: 'operations',
      navLabel: 'Playbooks',
    })
  })

  it('validates ordered step payloads for playbooks', () => {
    expect(
      createPlaybookInput.parse({
        title: 'Weekly QA',
        summary: 'Run the recurring launch quality pass.',
        status: 'active',
        steps: [
          {
            title: 'Kickoff',
            content: 'Confirm owner and release window.',
          },
        ],
      }),
    ).toMatchObject({
      status: 'active',
      steps: [
        {
          title: 'Kickoff',
          content: 'Confirm owner and release window.',
        },
      ],
    })

    expect(() =>
      updatePlaybookInput.parse({
        playbookId: 'pb_123',
        title: 'Weekly QA',
        summary: 'Run the recurring launch quality pass.',
        status: 'draft',
        steps: [],
      }),
    ).toThrow()
  })
})
