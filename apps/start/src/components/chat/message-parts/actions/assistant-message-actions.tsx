import { CheckIcon, CopyIcon, RedoIcon } from '@rift/ui/icons/svg-icons'
import {
  MessageActionButton,
  MessageActions,
} from './message-actions-primitives'
import { useMessageCopyAction } from './use-message-copy-action'

type AssistantMessageActionsProps = {
  messageId: string
  text: string
  modelName?: string | null
  canRegenerate: boolean
  onRegenerate: (messageId: string) => void
}

/**
 * Assistant-message action cluster plus optional model caption.
 */
export function AssistantMessageActions({
  messageId,
  text,
  modelName,
  canRegenerate,
  onRegenerate,
}: AssistantMessageActionsProps) {
  const { isCopied, copy } = useMessageCopyAction(text)

  return (
    <div className="flex items-center gap-2">
      <MessageActions className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
        <MessageActionButton
          tooltip="Regenerate response"
          label="Regenerate response"
          disabled={!canRegenerate}
          onClick={() => {
            if (!canRegenerate) return
            onRegenerate(messageId)
          }}
        >
          <RedoIcon className="size-4" />
        </MessageActionButton>
        <MessageActionButton
          tooltip="Copy text"
          label="Copy text"
          onClick={() => {
            void copy()
          }}
        >
          {isCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </MessageActionButton>
      </MessageActions>
      {modelName ? (
        <span className="mt-1 text-sm text-content-muted opacity-0 transition-opacity group-hover:opacity-100">
          {modelName}
        </span>
      ) : null}
    </div>
  )
}
