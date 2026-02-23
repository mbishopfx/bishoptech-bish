'use client'

import { InputHTMLAttributes, ReactNode, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { cn } from '@rift/utils'

import { Button } from './button'
import { Input } from './input'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

/**
 * Props for the settings-style Form component.
 * Renders a card-like form with title, description, single input, optional help text, and submit button.
 */
export interface FormProps {
  /** Section title shown above the input */
  title: string
  /** Short description below the title */
  description: string
  /** Spread onto the inner input (name, type, defaultValue, etc.) */
  inputAttrs: InputHTMLAttributes<HTMLInputElement>
  /**
   * Optional fixed prefix shown to the left of the input (e.g. "https://www.").
   * Rendered with muted background and text; the user only types the part after the prefix.
   * When string: submitted value is prefix + input value. When ReactNode: only input value is submitted.
   */
  inputPrefix?: string | ReactNode
  /** Optional help text or custom node below the input; supports HTML string */
  helpText?: string | ReactNode
  /** Submit button label */
  buttonText?: string
  /** When set, the input and button are disabled and this content is shown in a tooltip on the button */
  disabledTooltip?: string | ReactNode
  /** Called with form data { [inputAttrs.name]: value } on submit */
  handleSubmit: (data: Record<string, string>) => Promise<unknown>
}

function getInitialInputValue(
  defaultValue: InputHTMLAttributes<HTMLInputElement>['defaultValue'],
  prefix: string,
): string | number | readonly string[] | undefined {
  if (typeof defaultValue !== 'string' || typeof prefix !== 'string') return defaultValue
  if (defaultValue.startsWith(prefix)) return defaultValue.slice(prefix.length)
  return defaultValue
}

export function Form({
  title,
  description,
  inputAttrs,
  inputPrefix,
  helpText,
  buttonText = 'Save Changes',
  disabledTooltip,
  handleSubmit,
}: FormProps) {
  const prefixString = typeof inputPrefix === 'string' ? inputPrefix : undefined
  const initialValue =
    prefixString != null
      ? getInitialInputValue(inputAttrs.defaultValue, prefixString)
      : inputAttrs.defaultValue
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const next =
      prefixString != null
        ? getInitialInputValue(inputAttrs.defaultValue, prefixString)
        : inputAttrs.defaultValue
    setValue(next)
  }, [inputAttrs.defaultValue, prefixString])

  const saveDisabled = useMemo(() => {
    return saving || value == null || value === initialValue
  }, [saving, value, initialValue])

  const submittedValue =
    prefixString != null ? `${prefixString}${String(value ?? '')}` : String(value ?? '')

  const submitButton = (
    <Button
      type="submit"
      variant="default"
      size="large"
      disabled={saveDisabled || !!disabledTooltip}
    >
      {saving ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>Saving...</span>
        </>
      ) : (
        buttonText
      )}
    </Button>
  )

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
          await handleSubmit({
            [inputAttrs.name as string]: submittedValue,
          })
        } finally {
          setSaving(false)
        }
      }}
      className="rounded-xl border border-border-subtle bg-bg-default"
    >
      <div className="relative flex flex-col space-y-6 p-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold text-content-emphasis text-xl">
            {title}
          </h2>
          <p className="text-sm text-content-subtle">{description}</p>
        </div>

        {typeof inputAttrs.defaultValue === 'string' || inputPrefix != null ? (
          inputPrefix != null ? (
            <div
              className={cn(
                'flex w-full max-w-md rounded-md border border-border-default bg-bg-default text-content-emphasis sm:text-sm overflow-visible',
                disabledTooltip && 'cursor-not-allowed bg-bg-subtle',
              )}
            >
              <span
                className={cn(
                  'flex shrink-0 items-center border-r border-border-default bg-bg-subtle px-3 py-2 text-content-muted',
                  disabledTooltip && 'bg-bg-muted',
                )}
                aria-hidden
              >
                {inputPrefix}
              </span>
              <Input
                {...inputAttrs}
                type={inputAttrs.type ?? 'text'}
                required
                disabled={!!disabledTooltip}
                value={value as string | undefined}
                onChange={(e) => setValue(e.target.value)}
                className={cn(
                  'min-w-0 flex-1 rounded-none rounded-r-md border-0 border-l-0 bg-transparent px-3 py-2 placeholder:text-content-muted',
                  'focus-visible:border-content-subtle focus-visible:ring-3 focus-visible:ring-content-subtle/50 focus-visible:ring-offset-0',
                  disabledTooltip &&
                    'cursor-not-allowed bg-transparent text-content-muted',
                )}
              />
            </div>
          ) : (
            <Input
              {...inputAttrs}
              type={inputAttrs.type ?? 'text'}
              required
              disabled={!!disabledTooltip}
              value={value as string | undefined}
              onChange={(e) => setValue(e.target.value)}
              className={cn(
                'max-w-md rounded-md border-border-default text-content-emphasis placeholder:text-content-muted focus-visible:border-content-subtle focus-visible:ring-content-subtle/50 sm:text-sm',
                disabledTooltip &&
                  'cursor-not-allowed bg-bg-subtle text-content-muted',
              )}
            />
          )
        ) : (
          <div
            className="h-[2.35rem] w-full max-w-md animate-pulse rounded-md bg-bg-emphasis"
            aria-hidden
          />
        )}
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-b-xl border-t border-border-subtle bg-bg-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:py-3">
        {typeof helpText === 'string' ? (
          <p
            className="text-sm text-content-subtle prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-content-default transition-colors"
            dangerouslySetInnerHTML={{ __html: helpText }}
          />
        ) : (
          helpText
        )}
        <div className="w-fit shrink-0">
          {disabledTooltip ? (
            <Tooltip>
              <TooltipTrigger render={submitButton} />
              <TooltipContent>
                {typeof disabledTooltip === 'string' ? (
                  <span>{disabledTooltip}</span>
                ) : (
                  disabledTooltip
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            submitButton
          )}
        </div>
      </div>
    </form>
  )
}
