import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { z } from 'zod'
import {
  ModelPolicyRuntime,
  OrgModelPolicyInvalidRequestError,
  OrgModelPolicyMissingOrgContextError,
  OrgModelPolicyService,
  OrgModelPolicyUnauthorizedError,
  toOrgModelPolicyErrorResponse,
} from '@/lib/model-policy-backend'
import { requireOrgAuth } from '@/lib/server-effect/http/server-auth.server'

/** Request shape for provider-level policy updates. */
const ToggleProviderBody = z.object({
  action: z.literal('toggle_provider'),
  providerId: z.string().trim().min(1),
  disabled: z.boolean(),
})

/** Request shape for model-level policy updates. */
const ToggleModelBody = z.object({
  action: z.literal('toggle_model'),
  modelId: z.string().trim().min(1),
  disabled: z.boolean(),
})

/** Request shape for compliance flag updates. */
const ToggleComplianceFlagBody = z.object({
  action: z.literal('toggle_compliance_flag'),
  flag: z.string().trim().min(1),
  enabled: z.boolean(),
})

/** Request shape for organization-wide enforced mode updates. */
const SetEnforcedModeBody = z.object({
  action: z.literal('set_enforced_mode'),
  modeId: z.string().trim().min(1).nullable(),
})

/** Union for supported update actions handled by POST /api/org/model-policy. */
const UpdatePolicyBody = z.discriminatedUnion('action', [
  ToggleProviderBody,
  ToggleModelBody,
  ToggleComplianceFlagBody,
  SetEnforcedModeBody,
])

/** Org-scoped API for model policy read/write operations. */
export const Route = createFileRoute('/api/org/model-policy')({
  server: {
    handlers: {
      GET: async () => {
        const requestId = crypto.randomUUID()

        const program = Effect.gen(function* () {
          const authContext = yield* requireOrgAuth({
            onUnauthorized: () =>
              new OrgModelPolicyUnauthorizedError({
                message: 'Unauthorized',
                requestId,
              }),
            onMissingOrg: () =>
              new OrgModelPolicyMissingOrgContextError({
                message: 'Organization context is required for org settings.',
                requestId,
              }),
          })

          const policyService = yield* OrgModelPolicyService
          const payload = yield* policyService.getPayload({
            orgWorkosId: authContext.orgWorkosId,
            requestId,
          })

          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        })

        try {
          return await ModelPolicyRuntime.run(program)
        } catch (error) {
          return toOrgModelPolicyErrorResponse(error, requestId)
        }
      },
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID()

        const program = Effect.gen(function* () {
          const authContext = yield* requireOrgAuth({
            onUnauthorized: () =>
              new OrgModelPolicyUnauthorizedError({
                message: 'Unauthorized',
                requestId,
              }),
            onMissingOrg: () =>
              new OrgModelPolicyMissingOrgContextError({
                message: 'Organization context is required for org settings.',
                requestId,
              }),
          })

          const rawBody = yield* Effect.tryPromise({
            try: () => request.json(),
            catch: () =>
              new OrgModelPolicyInvalidRequestError({
                message: 'Invalid JSON body',
                requestId,
              }),
          })
          const parsedBody = UpdatePolicyBody.safeParse(rawBody)
          if (!parsedBody.success) {
            return yield* Effect.fail(
              new OrgModelPolicyInvalidRequestError({
                message: 'Invalid payload',
                requestId,
                details: parsedBody.error.issues,
              }),
            )
          }

          const policyService = yield* OrgModelPolicyService
          const payload = yield* policyService.updatePolicy({
            orgWorkosId: authContext.orgWorkosId,
            requestId,
            action: parsedBody.data,
          })

          return new Response(JSON.stringify(payload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        })

        try {
          return await ModelPolicyRuntime.run(program)
        } catch (error) {
          return toOrgModelPolicyErrorResponse(error, requestId)
        }
      },
    },
  },
})
