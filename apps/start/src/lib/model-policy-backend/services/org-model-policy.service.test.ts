import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import {
  validateUpdateOrgModelPolicyAction,
} from './org-model-policy.service'

describe('validateUpdateOrgModelPolicyAction', () => {
  it('accepts known tool keys', async () => {
    await expect(
      Effect.runPromise(
        validateUpdateOrgModelPolicyAction({
          requestId: 'req-valid-tool',
          action: {
            action: 'toggle_tool',
            toolKey: 'openai.web_search',
            disabled: true,
          },
        }),
      ),
    ).resolves.toBeUndefined()
  })

  it('rejects unknown tool keys', async () => {
    await expect(
      Effect.runPromise(
        validateUpdateOrgModelPolicyAction({
          requestId: 'req-invalid-tool',
          action: {
            action: 'toggle_tool',
            toolKey: 'unknown.tool',
            disabled: true,
          },
        }),
      ),
    ).rejects.toMatchObject({
      _tag: 'OrgModelPolicyInvalidRequestError',
      message: 'Unknown tool key: unknown.tool',
    })
  })
})
