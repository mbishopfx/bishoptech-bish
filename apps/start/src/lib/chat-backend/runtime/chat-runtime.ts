import { Layer } from 'effect'
import { makeRuntimeRunner } from '@/lib/server-effect'
import { ZeroDatabaseService } from '@/lib/server-effect/services/zero-database.service'
import { ChatOrchestratorService } from '../services/chat-orchestrator.service'
import { MessageStoreService } from '../services/message-store.service'
import { ModelGatewayService } from '../services/model-gateway.service'
import { ModelPolicyService } from '../services/model-policy.service'
import { RateLimitService } from '../services/rate-limit.service'
import { AttachmentRagService, OrgKnowledgeRagService } from '../services/rag'
import { StreamResumeService } from '../services/stream-resume.service'
import { ThreadService } from '../services/thread.service'
import { ToolRegistryService } from '../services/tool-registry.service'

/**
 * Dependency graph for chat runtime.
 * Persistence uses Zero/Postgres, stream resume uses Redis, and rate limiting
 * is temporarily in-memory until distributed limiter is introduced.
 */
const dependencyLayer = Layer.mergeAll(
  ThreadService.layer,
  MessageStoreService.layer,
  RateLimitService.layerMemory,
  ModelPolicyService.layer,
  ToolRegistryService.layer,
  ModelGatewayService.layer,
  StreamResumeService.layer,
).pipe(
  // Provide shared infra dependencies into service layers that require them.
  Layer.provideMerge(ZeroDatabaseService.layer),
  Layer.provideMerge(AttachmentRagService.layer),
  Layer.provideMerge(OrgKnowledgeRagService.layerNoop),
)

const layer = ChatOrchestratorService.layer.pipe(
  // Expose orchestrator plus operational dependencies used directly by routes.
  Layer.provideMerge(dependencyLayer),
)

const runtime = makeRuntimeRunner(layer)

export const ChatRuntime = {
  layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
