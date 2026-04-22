import { defineQuery } from '@rocicorp/zero'
import { z } from 'zod'
import { getOrgContext, missingOrganizationQuery } from '../org-access'
import { zql } from '../zql'

const emptyArgs = z.object({})

/**
 * Workspace tool activation needs to be available in the always-mounted left
 * rail. Keeping these reads in Zero lets nav state react immediately to
 * org-level plugin changes without introducing a second client cache.
 */
export const workspaceToolsQueryDefinitions = {
  workspaceTools: {
    pluginInstallations: defineQuery(emptyArgs, ({ ctx }) => {
      const scoped = getOrgContext(ctx)
      if (!scoped) {
        return missingOrganizationQuery()
      }

      return zql.orgPluginInstallation
        .where('organizationId', scoped.organizationId)
        .orderBy('pluginKey', 'asc')
    }),
    pluginEntitlements: defineQuery(emptyArgs, ({ ctx }) => {
      const scoped = getOrgContext(ctx)
      if (!scoped) {
        return missingOrganizationQuery()
      }

      return zql.orgPluginEntitlement
        .where('organizationId', scoped.organizationId)
        .orderBy('pluginKey', 'asc')
    }),
    integrationCredentials: defineQuery(emptyArgs, ({ ctx }) => {
      const scoped = getOrgContext(ctx)
      if (!scoped) {
        return missingOrganizationQuery()
      }

      return zql.orgIntegrationCredential
        .where('organizationId', scoped.organizationId)
        .orderBy('providerKey', 'asc')
    }),
  },
}
