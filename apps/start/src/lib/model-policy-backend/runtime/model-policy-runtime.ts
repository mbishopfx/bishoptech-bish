import { Layer } from 'effect'
import { makeRuntimeRunner } from '@/lib/server-effect'
import { WorkspaceBillingService } from '@/lib/billing-backend/services/workspace-billing.service'
import { OrgModelPolicyService } from '../services/org-model-policy.service'

const layer = Layer.mergeAll(
  WorkspaceBillingService.layer,
  OrgModelPolicyService.layer,
)

const runtime = makeRuntimeRunner(layer)

export const ModelPolicyRuntime = {
  layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
