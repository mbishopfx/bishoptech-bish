import { CheckIcon, CopyIcon, EditIcon, RedoIcon } from '@rift/ui/icons/svg-icons'
import { Button } from '@rift/ui/button'
import {
  MessageActionButton,
  MessageActions,
} from './message-actions-primitives'
import { useMessageCopyAction } from './use-message-copy-action'

const PENDING_REGEN_BRANCH_PREFIX = '__pending_regen_branch__'

type UserMessageActionsProps = {
  messageId: string
  text: string
  canRegenerate: boolean
  onRegenerate: (messageId: string) => void
  branchSelector?: {
    optionMessageIds: readonly string[]
    selectedMessageId: string
    disabled?: boolean
    onSelectMessageId: (messageId: string) => void
  }
}

/**
 * User-message action cluster.
 * Regenerate and copy are interactive; edit remains visual-only for now.
 */
export function UserMessageActions({
  messageId,
  text,
  canRegenerate,
  onRegenerate,
  branchSelector,
}: UserMessageActionsProps) {
  const { isCopied, copy } = useMessageCopyAction(text)

  return (
    <div className="mt-1 flex items-center justify-end gap-2">
      {branchSelector && branchSelector.optionMessageIds.length > 1 ? (
        <div className="flex items-center gap-1">
          {branchSelector.optionMessageIds.map((optionMessageId, index) => {
            const isSelected = optionMessageId === branchSelector.selectedMessageId
            const isPendingOption = optionMessageId.startsWith(
              PENDING_REGEN_BRANCH_PREFIX,
            )
            return (
              <Button
                key={optionMessageId}
                type="button"
                variant={isSelected ? 'default' : 'ghost'}
                className="h-7 min-w-7 px-2 text-xs"
                disabled={isPendingOption || !!branchSelector.disabled}
                onClick={() => {
                  if (isSelected || isPendingOption || branchSelector.disabled) return
                  branchSelector.onSelectMessageId(optionMessageId)
                }}
              >
                {index + 1}
              </Button>
            )
          })}
        </div>
      ) : null}
      <MessageActions className="justify-end opacity-0 transition-opacity group-hover:opacity-100">
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
    </div>
  )
}
