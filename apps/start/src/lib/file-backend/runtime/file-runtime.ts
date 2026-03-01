import { Layer } from 'effect'
import { makeRuntimeRunner } from '@/lib/server-effect'
import { AttachmentRagService } from '@/lib/chat-backend/services/rag'
import { ZeroDatabaseService } from '@/lib/server-effect/services/zero-database.service'
import { FileUploadOrchestratorService } from '../services/file-upload-orchestrator.service'
import { MarkdownConversionService } from '../services/markdown-conversion.service'

/**
 * File backend runtime wiring.
 */
const uploadLayer = FileUploadOrchestratorService.layer.pipe(
  Layer.provide(MarkdownConversionService.layer),
)

const layer = Layer.mergeAll(MarkdownConversionService.layer, uploadLayer).pipe(
  Layer.provideMerge(ZeroDatabaseService.layer),
  Layer.provideMerge(AttachmentRagService.layer),
)

const runtime = makeRuntimeRunner(layer)

export const FileRuntime = {
  layer,
  run: runtime.run,
  runExit: runtime.runExit,
  dispose: runtime.dispose,
}
