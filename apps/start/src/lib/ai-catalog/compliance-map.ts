import type { AiModelCatalogEntry } from './types'

export type OrgComplianceFlags = {
  readonly block_data_collection?: boolean
}

export function isDeniedByComplianceFlags(
  model: AiModelCatalogEntry,
  flags?: OrgComplianceFlags,
): boolean {
  if (flags?.block_data_collection && model.collectsData) {
    return true
  }
  return false
}
