import { Layer } from 'effect'
import { makeRuntimeRunner } from './runtime-runner'

/**
 * Generic runtime for route-level programs that only need framework-boundary
 * helpers (for example auth/context parsing) and no domain-specific services.
 */
const runtime = makeRuntimeRunner(Layer.empty)

export const ServerRuntime = {
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
