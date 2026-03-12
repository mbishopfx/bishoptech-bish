const SEARCH_HIGHLIGHT_ATTR = 'data-chat-search-highlight'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Removes any transient command-search highlights from the given message
 * container and normalizes text nodes back into their original shape.
 */
export function clearSearchHighlights(container: HTMLElement | null) {
  if (!container) return

  const highlights = container.querySelectorAll<HTMLElement>(
    `[${SEARCH_HIGHLIGHT_ATTR}="true"]`,
  )
  for (const highlight of highlights) {
    const parent = highlight.parentNode
    if (!parent) continue

    parent.replaceChild(
      document.createTextNode(highlight.textContent ?? ''),
      highlight,
    )
    parent.normalize()
  }
}

/**
 * Highlights literal query matches inside a rendered chat message without
 * touching code blocks or editable controls.
 *
 * The highlight intentionally uses background color only. Padding changes line
 * metrics and causes visible layout shift when the mark is later removed.
 */
export function highlightSearchQueryInMessage(input: {
  readonly container: HTMLElement
  readonly query: string
}): boolean {
  const normalizedQuery = input.query.trim()
  if (normalizedQuery.length === 0) return false

  clearSearchHighlights(input.container)

  const pattern = new RegExp(escapeRegExp(normalizedQuery), 'gi')
  const walker = document.createTreeWalker(
    input.container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT
        if (!node.textContent || node.textContent.trim().length === 0) {
          return NodeFilter.FILTER_REJECT
        }

        const parentElement = node.parentElement
        if (!parentElement) return NodeFilter.FILTER_REJECT
        if (
          parentElement.closest('code, pre, script, style, textarea, input') ||
          parentElement.hasAttribute(SEARCH_HIGHLIGHT_ATTR)
        ) {
          return NodeFilter.FILTER_REJECT
        }

        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  let textNode = walker.nextNode()
  let highlightedAny = false

  while (textNode) {
    const currentTextNode = textNode as Text
    const textContent = currentTextNode.textContent ?? ''
    pattern.lastIndex = 0

    const matches = Array.from(textContent.matchAll(pattern))
    if (matches.length > 0) {
      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      for (const match of matches) {
        const startIndex = match.index ?? -1
        if (startIndex < 0) continue

        const matchedText = match[0]
        const endIndex = startIndex + matchedText.length
        if (startIndex > lastIndex) {
          fragment.append(textContent.slice(lastIndex, startIndex))
        }

        const highlight = document.createElement('mark')
        highlight.setAttribute(SEARCH_HIGHLIGHT_ATTR, 'true')
        highlight.className =
          'rounded-[0.2rem] bg-foreground-info/20 text-inherit shadow-[inset_0_-1px_0_rgba(94,170,255,0.24)]'
        highlight.textContent = matchedText
        fragment.append(highlight)
        lastIndex = endIndex
        highlightedAny = true
      }

      if (lastIndex < textContent.length) {
        fragment.append(textContent.slice(lastIndex))
      }

      currentTextNode.parentNode?.replaceChild(fragment, currentTextNode)
    }

    textNode = walker.nextNode()
  }

  return highlightedAny
}
