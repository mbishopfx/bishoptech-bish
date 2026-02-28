import { CheckIcon, CopyIcon, RedoIcon } from '@rift/ui/icons/svg-icons'
import {
  MessageActionButton,
  MessageActions,
} from './message-actions-primitives'
import { useMessageCopyAction } from './use-message-copy-action'

type AssistantMessageActionsProps = {
  text: string
  modelName?: string | null
}

/**
 * Assistant-message action cluster plus optional model caption.
 */
export function AssistantMessageActions({
  text,
  modelName,
}: AssistantMessageActionsProps) {
  const { isCopied, copy } = useMessageCopyAction(text)

  return (
    <div className="flex items-center gap-2">
      <MessageActions className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
        <MessageActionButton tooltip="Regenerate response" label="Regenerate response">
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
