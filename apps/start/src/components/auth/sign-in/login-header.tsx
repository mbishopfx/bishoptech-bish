'use client'

import { motion } from 'motion/react'
import { m } from '@/paraglide/messages.js'
import { menuCardHeaderVariants } from '@/lib/animations'

export type LoginHeaderProps = {
  isSignUp: boolean
}

/**
 * Header block for the sign-in/sign-up page.
 * Shows welcome message for sign-in and create-account message for sign-up.
 */
export function LoginHeader({ isSignUp }: LoginHeaderProps) {
  return (
    <motion.div
      className="text-center mb-8"
      variants={menuCardHeaderVariants}
    >
      <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
        {isSignUp ? m.auth_login_header_sign_up() : m.auth_login_header_sign_in()}
      </h1>
      <p className="text-black/70 dark:text-white/60 text-lg mb-6">
        {isSignUp
          ? m.auth_login_header_sign_up_subtitle()
          : m.auth_login_header_sign_in_subtitle()}
      </p>
    </motion.div>
  )
}
