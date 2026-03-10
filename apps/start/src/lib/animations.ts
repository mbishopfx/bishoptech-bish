import type { Variants } from 'motion/react'

/**
 * Animation variants used by auth and card layouts.
 * Matches reference patterns for menu card and form transitions.
 */
export const staggerChildVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
}

/** Container for login/card screens with staggered children. */
export const menuCardContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.2,
      when: 'beforeChildren',
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      when: 'afterChildren',
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
}

export const menuCardHeaderVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.2 },
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.15 },
  },
}

export const menuCardButtonVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25, duration: 0.2 },
  },
  exit: {
    opacity: 0,
    y: 5,
    transition: { type: 'spring', stiffness: 300, damping: 25, duration: 0.1 },
  },
}

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25, duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { type: 'spring', stiffness: 300, damping: 25, duration: 0.2 },
  },
}

export const menuCardContentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.2 },
  },
}
