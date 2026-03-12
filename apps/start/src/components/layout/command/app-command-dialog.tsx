'use client'

import type { ReactNode } from 'react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@rift/ui/command'
import { cn } from '@rift/utils'

export type AppCommandItem = {
  readonly id: string
  readonly title: string
  readonly subtitle?: string
  readonly meta?: string
  readonly value?: string
  readonly icon?: ReactNode
  readonly onSelect: () => void
}

export type AppCommandGroup = {
  readonly id: string
  readonly heading: string
  readonly items: readonly AppCommandItem[]
}

type AppCommandDialogProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly title: string
  readonly description: string
  readonly query: string
  readonly onQueryChange: (query: string) => void
  readonly placeholder: string
  readonly emptyText: string
  readonly loadingText?: string
  readonly isLoading?: boolean
  readonly groups: readonly AppCommandGroup[]
}

/**
 * Reusable app-level command shell.
 *
 * Feature-specific providers are responsible for fetching data and converting
 * it into groups/items. The shell stays generic so future settings/actions can
 * reuse the same keyboard and layout behavior.
 */
export function AppCommandDialog({
  open,
  onOpenChange,
  title,
  description,
  query,
  onQueryChange,
  placeholder,
  emptyText,
  loadingText,
  isLoading = false,
  groups,
}: AppCommandDialogProps) {
  const showLoadingState = isLoading && groups.every((group) => group.items.length === 0)

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="max-w-3xl border-border-faint bg-[#050505] text-white shadow-[0_12px_48px_rgba(0,0,0,0.42)] sm:max-w-3xl"
      showCloseButton={false}
    >
      <Command
        shouldFilter={false}
        className="bg-transparent p-0"
      >
        <div className="border-b border-white/8 px-1 pb-1 pt-1">
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder={placeholder}
            className="text-base text-white placeholder:text-white/42"
          />
        </div>
        <CommandList className="max-h-[70vh] p-2">
          {showLoadingState ? (
            <div className="px-3 py-8 text-sm text-white/55">{loadingText ?? emptyText}</div>
          ) : null}
          {!showLoadingState ? <CommandEmpty className="py-8 text-white/50">{emptyText}</CommandEmpty> : null}
          {groups.map((group, index) => (
            <div key={group.id}>
              {index > 0 ? <CommandSeparator className="my-2 bg-white/7" /> : null}
              <CommandGroup
                heading={group.heading}
                className="p-0 text-white/60 **:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:pt-1 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:tracking-normal"
              >
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.value ?? `${item.title} ${item.subtitle ?? ''} ${item.meta ?? ''}`}
                    onSelect={item.onSelect}
                    className={cn(
                      'mx-1 min-h-14 rounded-xl px-3 py-3 text-white data-selected:bg-white/9 data-selected:text-white',
                      'border border-transparent data-selected:border-white/6',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      {item.icon ? (
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/6 text-white/70">
                          {item.icon}
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium leading-5 text-white">
                          {item.title}
                        </div>
                        {item.subtitle ? (
                          <div className="mt-1 line-clamp-2 text-sm leading-5 text-white/52">
                            {item.subtitle}
                          </div>
                        ) : null}
                      </div>
                      {item.meta ? (
                        <div className="shrink-0 pl-3 text-xs leading-5 text-white/42">
                          {item.meta}
                        </div>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
