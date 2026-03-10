'use client'

import { motion } from 'motion/react'
import { m } from '@/paraglide/messages.js'
import { staggerChildVariants } from '@/lib/animations'

export type LegalLinksProps = {
  isSignUp: boolean
}

const linkClassName =
  'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium'

/**
 * Legal links section: terms, acceptable use, and privacy policy.
 */
export function LegalLinks({ isSignUp }: LegalLinksProps) {
  const prefix = isSignUp ? m.auth_legal_sign_up_prefix() : m.auth_legal_sign_in_prefix()
  return (
    <motion.div
      variants={staggerChildVariants}
      className="text-center mt-6"
    >
      <p className="text-[10px] text-black/60 dark:text-white/60 leading-relaxed">
        {prefix}
        <a href="/legal/terms" className={linkClassName}>
          {m.auth_legal_terms()}
        </a>
        {m.auth_legal_comma()}
        <a href="/legal/acceptable-use" className={linkClassName}>
          {m.auth_legal_acceptable_use()}
        </a>
        {m.auth_legal_and()}
        <a href="/legal/privacy" className={linkClassName}>
          {m.auth_legal_privacy()}
        </a>
        {m.auth_legal_suffix()}
      </p>
    </motion.div>
  )
}
