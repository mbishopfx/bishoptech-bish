import { useCallback, useState } from 'react'
import { copyToClipboard } from '@rift/utils'

/**
 * Shared clipboard state for message action rows.
 * Encapsulates "copied" affordance timing so action components stay declarative.
 */
export function useMessageCopyAction(textOrGetter: string | (() => string)) {
  const [isCopied, setIsCopied] = useState(false)

  const copy = useCallback(async () => {
    const text =
      typeof textOrGetter === 'function' ? textOrGetter() : textOrGetter
    await copyToClipboard(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }, [textOrGetter])

  return {
    isCopied,
    copy,
  }
}
