"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@rift/utils"

function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  const normalizedValue = value != null ? value : null
  return (
    <ProgressPrimitive.Root
      value={normalizedValue}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children ?? (
        <>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </>
      )}
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({
  className,
  ...props
}: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full flex items-center",
        className
      )}
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "bg-primary h-full rounded-full transition-all duration-300 ease-out",
        className
      )}
      {...props}
    />
  )
}

function ProgressLabel({
  className,
  ...props
}: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      data-slot="progress-label"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function ProgressValue({
  className,
  ...props
}: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn(
        "text-muted-foreground ml-auto text-sm tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
