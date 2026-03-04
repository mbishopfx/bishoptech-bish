import { defineQuery } from '@rocicorp/zero'
import { zql } from '../zql'

/**
 * Organization policy queries are isolated in this module so org settings
 * can evolve independently from chat data queries.
 */
export const orgPolicyQueryDefinitions = {
  orgPolicy: {
    /**
     * Returns the AI policy row for the authenticated organization.
     * The org id comes from server-injected Zero context, not user input.
     */
    current: defineQuery(({ ctx }) =>
      zql.orgAiPolicy.where('organizationId', ctx.organizationId ?? '__missing_org__').one(),
    ),
  },
}
