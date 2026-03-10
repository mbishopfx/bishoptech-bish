import { Layer } from 'effect'
import { makeRuntimeRunner } from '@/lib/server-effect'
import { WorkspaceBillingService } from '../services/workspace-billing.service'
import { WorkspaceUsageQuotaService } from '../services/workspace-usage-quota.service'
import { WorkspaceUsageSettlementService } from '../services/workspace-usage-settlement.service'

const layer = Layer.mergeAll(
  WorkspaceBillingService.layer,
  WorkspaceUsageQuotaService.layer,
  WorkspaceUsageSettlementService.layer,
)
const runtime = makeRuntimeRunner(layer)

export const WorkspaceBillingRuntime = {
  layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
