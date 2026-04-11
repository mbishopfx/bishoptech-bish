import { PgClient } from '@effect/sql-pg'
import { Effect } from 'effect'
import { runAuthRuntimeEffect } from '@/lib/backend/auth/runtime/auth-runtime'
import {
  buildDefaultOrganizationName,
  shouldProvisionDefaultOrganization,
} from '@/lib/backend/auth/domain/default-organization.helpers'
import { sqlJson } from '@/lib/backend/server-effect/services/upstream-postgres.service'
import {
  resolveWorkspaceEffectiveFeatures,
} from '@/lib/shared/access-control'
import { buildDisabledUsagePolicy } from '@/lib/backend/billing/services/workspace-usage/shared'
import { isSelfHosted } from '@/utils/app-feature-flags'

type OrganizationCountsRow = {
  activeMemberCount: number
  pendingInvitationCount: number
}

const SELF_HOSTED_DEFAULT_SEAT_COUNT = 100_000

export function slugifyOrganizationName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export const findFirstOrganizationForUserEffect = Effect.fn(
  'DefaultOrganization.findFirstOrganizationForUser',
)(
  (userId: string): Effect.Effect<string | null, unknown, PgClient.PgClient> =>
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient
      const [row] = yield* sql<{ organizationId: string }>`
        select "organizationId" as "organizationId"
        from member
        where "userId" = ${userId}
        order by "createdAt" asc
        limit 1
      `

      return row?.organizationId ?? null
    }),
)

export async function findFirstOrganizationForUser(
  userId: string,
): Promise<string | null> {
  return runAuthRuntimeEffect(findFirstOrganizationForUserEffect(userId))
}

const readOrganizationCountsEffect = Effect.fn(
  'DefaultOrganization.readOrganizationCounts',
)(
  (
    organizationId: string,
  ): Effect.Effect<OrganizationCountsRow, unknown, PgClient.PgClient> =>
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient
      const [row] = yield* sql<OrganizationCountsRow>`
        select
          (select count(*)::int from member where "organizationId" = ${organizationId}) as "activeMemberCount",
          (select count(*)::int from invitation where "organizationId" = ${organizationId} and status = 'pending') as "pendingInvitationCount"
      `

      return row ?? {
        activeMemberCount: 0,
        pendingInvitationCount: 0,
      }
    }),
)

/**
 * Billing defaults are stored for every organization so the app can enforce
 * seat limits and render billing state before a paid subscription exists.
 */
export const ensureOrganizationBillingBaselineEffect = Effect.fn(
  'DefaultOrganization.ensureOrganizationBillingBaseline',
)(
  (
    organizationId: string,
  ): Effect.Effect<void, unknown, PgClient.PgClient> =>
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient
      const now = Date.now()
      const billingAccountId = `billing_${organizationId}`
      const subscriptionId = `subscription_${organizationId}`
      const isSelfHostedWorkspace = isSelfHosted
      const defaultPlanId = isSelfHostedWorkspace ? 'self_hosted' : 'free'
      const defaultSeatCount = isSelfHostedWorkspace ? SELF_HOSTED_DEFAULT_SEAT_COUNT : 1
      const defaultSubscriptionStatus = isSelfHostedWorkspace ? 'active' : 'inactive'
      const defaultEffectiveFeatures = isSelfHostedWorkspace
        ? resolveWorkspaceEffectiveFeatures({
            planId: 'self_hosted',
          })
        : {}
      const defaultUsagePolicy = isSelfHostedWorkspace
        ? buildDisabledUsagePolicy('self_hosted')
        : {}

      yield* sql.withTransaction(
        Effect.gen(function* () {
          const counts = yield* readOrganizationCountsEffect(organizationId)

          yield* sql`
            insert into org_billing_account (
              id,
              organization_id,
              provider,
              status,
              created_at,
              updated_at
            )
            values (
              ${billingAccountId},
              ${organizationId},
              'manual',
              'active',
              ${now},
              ${now}
            )
            on conflict (organization_id) do update
            set updated_at = excluded.updated_at
          `

          yield* sql`
            insert into org_subscription (
              id,
              organization_id,
              billing_account_id,
              provider_subscription_id,
              plan_id,
              billing_interval,
              seat_count,
              status,
              current_period_start,
              current_period_end,
              cancel_at_period_end,
              scheduled_plan_id,
              scheduled_seat_count,
              scheduled_change_effective_at,
              pending_change_reason,
              metadata,
              created_at,
              updated_at
            )
            values (
              ${subscriptionId},
              ${organizationId},
              ${billingAccountId},
              null,
              ${defaultPlanId},
              null,
              ${defaultSeatCount},
              ${defaultSubscriptionStatus},
              null,
              null,
              false,
              null,
              null,
              null,
              null,
              ${sqlJson(sql, {
                source: isSelfHostedWorkspace ? 'self_hosted_bootstrap' : 'default_baseline',
              })},
              ${now},
              ${now}
            )
            on conflict (id) do update
            set plan_id = excluded.plan_id,
                seat_count = excluded.seat_count,
                status = excluded.status,
                metadata = excluded.metadata,
                updated_at = excluded.updated_at
          `

          yield* sql`
            insert into org_entitlement_snapshot (
              organization_id,
              plan_id,
              billing_provider,
              subscription_status,
              seat_count,
              active_member_count,
              pending_invitation_count,
              is_over_seat_limit,
              effective_features,
              usage_policy,
              usage_sync_status,
              usage_sync_error,
              computed_at,
              version
            )
            values (
              ${organizationId},
              ${defaultPlanId},
              'manual',
              ${defaultSubscriptionStatus},
              ${defaultSeatCount},
              ${counts.activeMemberCount},
              ${counts.pendingInvitationCount},
              ${counts.activeMemberCount > defaultSeatCount
                || (counts.activeMemberCount + counts.pendingInvitationCount) > defaultSeatCount},
              ${sqlJson(sql, defaultEffectiveFeatures)},
              ${sqlJson(sql, defaultUsagePolicy)},
              'ok',
              null,
              ${now},
              1
            )
            on conflict (organization_id) do update
            set plan_id = excluded.plan_id,
                billing_provider = excluded.billing_provider,
                subscription_status = excluded.subscription_status,
                seat_count = excluded.seat_count,
                active_member_count = excluded.active_member_count,
                pending_invitation_count = excluded.pending_invitation_count,
                is_over_seat_limit = excluded.is_over_seat_limit,
                effective_features = excluded.effective_features,
                usage_policy = excluded.usage_policy,
                usage_sync_status = excluded.usage_sync_status,
                usage_sync_error = excluded.usage_sync_error,
                computed_at = excluded.computed_at,
                version = excluded.version
          `
        }),
      )
    }),
)

export async function ensureOrganizationBillingBaseline(
  organizationId: string,
): Promise<void> {
  await runAuthRuntimeEffect(
    ensureOrganizationBillingBaselineEffect(organizationId),
  )
}

/**
 * Member access records let the app evolve into org-scoped suspensions later
 * without rewriting the authorization model again. For now every new member
 * starts active.
 */
export const ensureMemberAccessRecordEffect = Effect.fn(
  'DefaultOrganization.ensureMemberAccessRecord',
)(
  (input: {
    organizationId: string
    userId: string
  }): Effect.Effect<void, unknown, PgClient.PgClient> =>
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient
      const now = Date.now()

      yield* sql`
        insert into org_member_access (
          id,
          organization_id,
          user_id,
          status,
          created_at,
          updated_at
        )
        values (
          ${`member_access_${input.organizationId}_${input.userId}`},
          ${input.organizationId},
          ${input.userId},
          'active',
          ${now},
          ${now}
        )
        on conflict (organization_id, user_id) do update
        set status = 'active',
            updated_at = excluded.updated_at
      `
    }),
)

export async function ensureMemberAccessRecord(input: {
  organizationId: string
  userId: string
}): Promise<void> {
  await runAuthRuntimeEffect(ensureMemberAccessRecordEffect(input))
}

export {
  buildDefaultOrganizationName,
  shouldProvisionDefaultOrganization,
}
