import { CheckIcon, CopyIcon, EditIcon, RedoIcon } from '@rift/ui/icons/svg-icons'
import {
  MessageActionButton,
  MessageActions,
} from './message-actions-primitives'
import { useMessageCopyAction } from './use-message-copy-action'

type UserMessageActionsProps = {
  text: string
}

/**
 * User-message action cluster.
 * Only copy is interactive for now; regenerate/edit are intentionally visual.
 */
export function UserMessageActions({ text }: UserMessageActionsProps) {
  const { isCopied, copy } = useMessageCopyAction(text)

  return (
    <MessageActions className="mt-1 justify-end opacity-0 transition-opacity group-hover:opacity-100">
      <MessageActionButton tooltip="Regenerate response" label="Regenerate response">
        <RedoIcon className="size-4" />
      </MessageActionButton>
      <MessageActionButton tooltip="Edit message" label="Edit message">
        <EditIcon className="size-4" />
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
  )
}
