'use client'

import { memo, useId } from 'react'
import { motion } from 'motion/react'
import { cn } from '@bish/utils'

const SHIMMER_ICON_MASK_SIZE = 36

const circleA =
  'M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z'

const infinity =
  'M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z'

const circleB =
  'M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z'

type ReasoningMotionIconProps = {
  isAnimating: boolean
  size?: number
  className?: string
  shimmerClassName?: string
  'aria-hidden'?: boolean | 'true' | 'false'
}

export const ReasoningMotionIcon = memo(function ReasoningMotionIcon({
  isAnimating,
  size = SHIMMER_ICON_MASK_SIZE,
  className,
  shimmerClassName,
  'aria-hidden': ariaHidden,
}: ReasoningMotionIconProps) {
  const maskId = useId()
  const maskSize = `${size}px ${size}px`

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      aria-hidden={ariaHidden}
    >
      <svg aria-hidden className="absolute size-0 overflow-hidden">
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={size}
            height={size}
          >
            <motion.path
              d={circleA}
              animate={
                isAnimating
                  ? {
                      d: [circleA, infinity, circleB, infinity, circleA],
                    }
                  : undefined
              }
              transition={
                isAnimating
                  ? {
                      d: {
                        duration: 6,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        times: [0, 0.25, 0.5, 0.75, 1.0],
                      },
                    }
                  : undefined
              }
              fill="none"
              stroke="white"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="scale(1.5)"
            />
          </mask>
        </defs>
      </svg>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'text-foreground-secondary',
          isAnimating && shimmerClassName && 'invisible',
        )}
      >
        <motion.path
          d={circleA}
          animate={
            isAnimating
              ? {
                  d: [circleA, infinity, circleB, infinity, circleA],
                }
              : undefined
          }
          transition={
            isAnimating
              ? {
                  d: {
                    duration: 6,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    times: [0, 0.25, 0.5, 0.75, 1.0],
                  },
                }
              : undefined
          }
        />
      </motion.svg>
      {isAnimating && shimmerClassName ? (
        <div
          className={cn('absolute inset-0', shimmerClassName)}
          style={{
            mask: `url(#${maskId})`,
            maskSize,
            maskRepeat: 'no-repeat',
            maskPosition: '0 0',
            WebkitMask: `url(#${maskId})`,
            WebkitMaskSize: maskSize,
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: '0 0',
          }}
        />
      ) : null}
    </span>
  )
})
