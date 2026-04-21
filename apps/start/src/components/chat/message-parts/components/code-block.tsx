'use client'

import type {
  ComponentProps,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react'

import { Button } from '@bish/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bish/ui/select'
import { cn } from '@bish/utils'
import CheckIcon from 'lucide-react/dist/esm/icons/check'
import CopyIcon from 'lucide-react/dist/esm/icons/copy'
import DownloadIcon from 'lucide-react/dist/esm/icons/download'
import ExpandIcon from 'lucide-react/dist/esm/icons/expand'
import MinimizeIcon from 'lucide-react/dist/esm/icons/minimize'
import WrapTextIcon from 'lucide-react/dist/esm/icons/wrap-text'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check

const isItalic = (fontStyle: number | undefined) => fontStyle && fontStyle & 1
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check

// oxlint-disable-next-line eslint(no-bitwise)
const isBold = (fontStyle: number | undefined) => fontStyle && fontStyle & 2
const isUnderline = (fontStyle: number | undefined) =>
  // biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag check
  // oxlint-disable-next-line eslint(no-bitwise)
  fontStyle && fontStyle & 4

interface KeyedToken {
  token: RawToken
  key: string
}
interface KeyedLine {
  tokens: KeyedToken[]
  key: string
}

type RawToken = {
  readonly color?: string
  readonly content: string
  readonly bgColor?: string
  readonly fontStyle?: number
  readonly htmlStyle?: CSSProperties
}

export type CodeBlockLanguage = string

const addKeysToTokens = (lines: RawToken[][]): KeyedLine[] =>
  lines.map((line, lineIdx) => ({
    key: `line-${lineIdx}`,
    tokens: line.map((token, tokenIdx) => ({
      key: `line-${lineIdx}-${tokenIdx}`,
      token,
    })),
  }))

const TokenSpan = ({ token }: { token: RawToken }) => (
  <span
    className="dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)]"
    style={
      {
        backgroundColor: token.bgColor,
        color: token.color,
        fontStyle: isItalic(token.fontStyle) ? 'italic' : undefined,
        fontWeight: isBold(token.fontStyle) ? 'bold' : undefined,
        textDecoration: isUnderline(token.fontStyle) ? 'underline' : undefined,
        ...(typeof token.htmlStyle === 'object' && token.htmlStyle !== null
          ? token.htmlStyle
          : {}),
      } as CSSProperties
    }
  >
    {token.content}
  </span>
)

const LineSpan = ({
  keyedLine,
  showLineNumbers,
  isLineWrapped,
  lineNumber,
}: {
  keyedLine: KeyedLine
  showLineNumbers: boolean
  isLineWrapped: boolean
  lineNumber: number
}) => (
  <span className="block">
    {showLineNumbers ? (
      <span className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-4">
        <span
          aria-hidden="true"
          className="select-none text-right font-geist-mono text-foreground-secondary/60"
        >
          {lineNumber}
        </span>
        <span
          className={cn(isLineWrapped && 'whitespace-pre-wrap break-words')}
        >
          {keyedLine.tokens.length === 0
            ? '\n'
            : keyedLine.tokens.map(({ token, key }) => (
                <TokenSpan key={key} token={token} />
              ))}
        </span>
      </span>
    ) : (
      <span className={cn(isLineWrapped && 'whitespace-pre-wrap break-words')}>
        {keyedLine.tokens.length === 0
          ? '\n'
          : keyedLine.tokens.map(({ token, key }) => (
              <TokenSpan key={key} token={token} />
            ))}
      </span>
    )}
  </span>
)

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string
  language: CodeBlockLanguage
  showLineNumbers?: boolean
}

interface TokenizedCode {
  tokens: RawToken[][]
  fg: string
  bg: string
}

interface CodeBlockContextType {
  code: string
  language: CodeBlockLanguage
  isLineWrapped: boolean
  isFullscreen: boolean
  toggleLineWrap: () => void
  toggleFullscreen: () => void
}

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
  language: 'text',
  isLineWrapped: false,
  isFullscreen: false,
  toggleLineWrap: () => {},
  toggleFullscreen: () => {},
})

const LANGUAGE_EXTENSION: Partial<Record<CodeBlockLanguage, string>> = {
  bash: 'sh',
  css: 'css',
  html: 'html',
  javascript: 'js',
  json: 'json',
  jsx: 'jsx',
  markdown: 'md',
  python: 'py',
  scss: 'scss',
  shell: 'sh',
  sql: 'sql',
  text: 'txt',
  tsx: 'tsx',
  typescript: 'ts',
  yaml: 'yml',
}

const tokensCache = new Map<string, TokenizedCode>()

const getTokensCacheKey = (code: string, language: CodeBlockLanguage) => {
  const start = code.slice(0, 100)
  const end = code.length > 100 ? code.slice(-100) : ''
  return `${language}:${code.length}:${start}:${end}`
}

const createRawTokens = (code: string): TokenizedCode => ({
  bg: 'transparent',
  fg: 'inherit',
  tokens: code.split('\n').map((line) =>
    line === ''
      ? []
      : [
          {
            color: 'inherit',
            content: line,
          } as ThemedToken,
        ],
  ),
})

export const highlightCode = (
  code: string,
  language: CodeBlockLanguage,
  callback?: (result: TokenizedCode) => void,
): TokenizedCode | null => {
  const tokensCacheKey = getTokensCacheKey(code, language)

  const cached = tokensCache.get(tokensCacheKey)
  if (cached) {
    return cached
  }

  /**
   * Production deploys currently prioritize build reliability over syntax
   * coloration. Returning plain tokens keeps code blocks readable while
   * removing the very large Shiki bundle from the Railway build path.
   */
  const tokenized = createRawTokens(code)
  tokensCache.set(tokensCacheKey, tokenized)
  callback?.(tokenized)

  return null
}

const CodeBlockBody = memo(
  ({
    tokenized,
    showLineNumbers,
    isLineWrapped,
    className,
  }: {
    tokenized: TokenizedCode
    showLineNumbers: boolean
    isLineWrapped: boolean
    className?: string
  }) => {
    const preStyle = useMemo(
      () => ({
        backgroundColor: tokenized.bg,
        color: tokenized.fg,
      }),
      [tokenized.bg, tokenized.fg],
    )

    const keyedLines = useMemo(
      () => addKeysToTokens(tokenized.tokens),
      [tokenized.tokens],
    )

    return (
      <pre
        className={cn(
          'dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)] m-0 overflow-auto rounded-b-xl px-4 pb-4 pt-3 text-sm leading-6',
          className,
        )}
        style={preStyle}
      >
        <code
          className={cn(
            'font-geist-mono text-sm',
            !showLineNumbers &&
              isLineWrapped &&
              'whitespace-pre-wrap break-words',
          )}
        >
          {keyedLines.map((keyedLine, lineIdx) => (
            <LineSpan
              key={keyedLine.key}
              keyedLine={keyedLine}
              showLineNumbers={showLineNumbers}
              isLineWrapped={isLineWrapped}
              lineNumber={lineIdx + 1}
            />
          ))}
        </code>
      </pre>
    )
  },
  (prevProps, nextProps) =>
    prevProps.tokenized === nextProps.tokenized &&
    prevProps.showLineNumbers === nextProps.showLineNumbers &&
    prevProps.isLineWrapped === nextProps.isLineWrapped &&
    prevProps.className === nextProps.className,
)

CodeBlockBody.displayName = 'CodeBlockBody'

export const CodeBlockContainer = ({
  className,
  language,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { language: string }) => (
  <div
    className={cn(
      'group relative w-full overflow-hidden rounded-xl border border-border-light bg-surface-base text-foreground-strong',
      className,
    )}
    data-language={language}
    style={{
      containIntrinsicSize: 'auto 200px',
      contentVisibility: 'auto',
      ...style,
    }}
    {...props}
  />
)

export const CodeBlockHeader = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-between border-border-light border-b bg-surface-base px-3 py-1.5 text-[13px] leading-[22px] text-foreground-tertiary',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)

export const CodeBlockTitle = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2', className)} {...props}>
    {children}
  </div>
)

export const CodeBlockFilename = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'font-geist-mono text-[13px] text-foreground-tertiary',
      className,
    )}
    {...props}
  >
    {children}
  </span>
)

export const CodeBlockActions = ({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-2.5', className)} {...props}>
    {children}
  </div>
)

export const CodeBlockContent = ({
  code,
  language,
  showLineNumbers = true,
}: {
  code: string
  language: CodeBlockLanguage
  showLineNumbers?: boolean
}) => {
  const { isLineWrapped } = useContext(CodeBlockContext)
  const rawTokens = useMemo(() => createRawTokens(code), [code])

  const [tokenized, setTokenized] = useState<TokenizedCode>(
    () => highlightCode(code, language) ?? rawTokens,
  )

  useEffect(() => {
    let cancelled = false

    setTokenized(highlightCode(code, language) ?? rawTokens)

    highlightCode(code, language, (result) => {
      if (!cancelled) {
        setTokenized(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [code, language, rawTokens])

  return (
    <div
      className={cn(
        'relative h-full bg-surface-base',
        isLineWrapped ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto',
      )}
    >
      <CodeBlockBody
        isLineWrapped={isLineWrapped}
        showLineNumbers={showLineNumbers}
        tokenized={tokenized}
      />
    </div>
  )
}

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = true,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [isLineWrapped, setIsLineWrapped] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) return

    const previousOverflow = document.body.style.overflow
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [isFullscreen])

  const toggleLineWrap = useCallback(() => {
    setIsLineWrapped((current) => !current)
  }, [])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => !current)
  }, [])

  const contextValue = useMemo(
    () => ({
      code,
      language,
      isLineWrapped,
      isFullscreen,
      toggleLineWrap,
      toggleFullscreen,
    }),
    [
      code,
      language,
      isLineWrapped,
      isFullscreen,
      toggleLineWrap,
      toggleFullscreen,
    ],
  )

  const blockChildren: ReactNode = (
    <>
      {children}
      <div className="min-h-0 flex-1">
        <CodeBlockContent
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
        />
      </div>
    </>
  )

  return (
    <CodeBlockContext.Provider value={contextValue}>
      <CodeBlockContainer className={className} language={language} {...props}>
        {blockChildren}
      </CodeBlockContainer>
      {isFullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex p-4">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black/60"
              onClick={toggleFullscreen}
            />
            <CodeBlockContainer
              className={cn(
                className,
                'relative z-10 !m-0 flex h-full min-h-0 w-full max-w-none flex-1 flex-col shadow-2xl',
              )}
              language={language}
              {...props}
            >
              {blockChildren}
            </CodeBlockContainer>
          </div>,
          document.body,
        )}
    </CodeBlockContext.Provider>
  )
}

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void
  onError?: (error: Error) => void
  timeout?: number
}

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false)
  const timeoutRef = useRef<number>(0)
  const { code } = useContext(CodeBlockContext)

  const copyToClipboard = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      onError?.(new Error('Clipboard API not available'))
      return
    }

    try {
      if (!isCopied) {
        await navigator.clipboard.writeText(code)
        setIsCopied(true)
        onCopy?.()
        timeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
          timeout,
        )
      }
    } catch (error) {
      onError?.(error as Error)
    }
  }, [code, onCopy, onError, timeout, isCopied])

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current)
    },
    [],
  )

  const Icon = isCopied ? CheckIcon : CopyIcon

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  )
}

export type CodeBlockLineWrapButtonProps = ComponentProps<typeof Button>

export const CodeBlockLineWrapButton = ({
  className,
  ...props
}: CodeBlockLineWrapButtonProps) => {
  const { isLineWrapped, toggleLineWrap } = useContext(CodeBlockContext)

  return (
    <Button
      aria-label={isLineWrapped ? 'Disable line wrap' : 'Enable line wrap'}
      className={cn('shrink-0', className)}
      onClick={toggleLineWrap}
      size="icon"
      variant="ghost"
      {...props}
    >
      <WrapTextIcon size={14} />
    </Button>
  )
}

export type CodeBlockDownloadButtonProps = ComponentProps<typeof Button> & {
  filename?: string
  onError?: (error: Error) => void
}

function getDefaultDownloadFilename(language: CodeBlockLanguage): string {
  const ext = LANGUAGE_EXTENSION[language] ?? 'txt'
  return `code.${ext}`
}

export const CodeBlockDownloadButton = ({
  className,
  filename,
  onError,
  children,
  ...props
}: CodeBlockDownloadButtonProps) => {
  const { code, language } = useContext(CodeBlockContext)
  const resolvedFilename = filename ?? getDefaultDownloadFilename(language)

  const download = useCallback(() => {
    try {
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resolvedFilename
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      onError?.(error as Error)
    }
  }, [code, resolvedFilename, onError])

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={download}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <DownloadIcon size={14} />}
    </Button>
  )
}

export type CodeBlockFullscreenButtonProps = ComponentProps<typeof Button>

export const CodeBlockFullscreenButton = ({
  className,
  ...props
}: CodeBlockFullscreenButtonProps) => {
  const { isFullscreen, toggleFullscreen } = useContext(CodeBlockContext)
  const Icon = isFullscreen ? MinimizeIcon : ExpandIcon

  return (
    <Button
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      className={cn('shrink-0', className)}
      onClick={toggleFullscreen}
      size="icon"
      variant="ghost"
      {...props}
    >
      <Icon size={14} />
    </Button>
  )
}

export type CodeBlockLanguageSelectorProps = ComponentProps<typeof Select>

export const CodeBlockLanguageSelector = (
  props: CodeBlockLanguageSelectorProps,
) => <Select {...props} />

export type CodeBlockLanguageSelectorTriggerProps = ComponentProps<
  typeof SelectTrigger
>

export const CodeBlockLanguageSelectorTrigger = ({
  className,
  ...props
}: CodeBlockLanguageSelectorTriggerProps) => (
  <SelectTrigger
    className={cn(
      'h-7 border-none bg-transparent px-2 text-xs shadow-none',
      className,
    )}
    size="sm"
    {...props}
  />
)

export type CodeBlockLanguageSelectorValueProps = ComponentProps<
  typeof SelectValue
>

export const CodeBlockLanguageSelectorValue = (
  props: CodeBlockLanguageSelectorValueProps,
) => <SelectValue {...props} />

export type CodeBlockLanguageSelectorContentProps = ComponentProps<
  typeof SelectContent
>

export const CodeBlockLanguageSelectorContent = ({
  align = 'end',
  ...props
}: CodeBlockLanguageSelectorContentProps) => (
  <SelectContent align={align} {...props} />
)

export type CodeBlockLanguageSelectorItemProps = ComponentProps<
  typeof SelectItem
>

export const CodeBlockLanguageSelectorItem = (
  props: CodeBlockLanguageSelectorItemProps,
) => <SelectItem {...props} />
