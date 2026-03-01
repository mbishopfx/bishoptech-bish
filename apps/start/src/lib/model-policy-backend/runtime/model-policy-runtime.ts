import { makeRuntimeRunner } from '@/lib/server-effect'
import { OrgModelPolicyService } from '../services/org-model-policy.service'

const runtime = makeRuntimeRunner(OrgModelPolicyService.layer)

export const ModelPolicyRuntime = {
  layer: OrgModelPolicyService.layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
