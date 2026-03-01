import { Layer } from 'effect'
import { makeRuntimeRunner } from '@/lib/server-effect'
import { ByokExecutorService } from '../services/byok-executor.service'
import { WorkOsOrgResolverService } from '../services/workos-org-resolver.service'

/**
 * Runtime composition for BYOK server-side effects.
 * Keeps service wiring centralized so handlers only execute domain programs.
 */
const layer = Layer.mergeAll(
  WorkOsOrgResolverService.layer,
  ByokExecutorService.layer,
)

const runtime = makeRuntimeRunner(layer)

export const ByokRuntime = {
  layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
