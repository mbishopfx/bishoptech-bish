"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@rift/utils"

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-clip-padding text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-button-secondary-hover text-button-secondary-text-hover hover:bg-button-secondary-hover/90",
        destructive:
          "bg-button-destructive text-secondary",
        outline:
          "bg-button-secondary-hover text-button-secondary-text-hover hover:bg-button-secondary-hover/90",
        secondary:
          "bg-button-secondary text-button-secondary-text hover:bg-button-secondary-hover hover:text-button-secondary-text-hover",
        ghost:
          "bg-transparent text-button-secondary-text hover:bg-button-secondary-hover hover:text-button-secondary-text-hover",
        link:
         "bg-button-link text-secondary",
        accent:
         "bg-button-accent text-white dark:text-white font-semibold border border-border/60 shadow-sm shadow-black/5 dark:shadow-black/30 hover:opacity-90",
      },
      size: {
        default: "rounded-3xl h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "rounded-md h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "rounded-3xl h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
        iconSm: "size-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
