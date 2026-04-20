'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@bish/ui/button'
import { Input } from '@bish/ui/input'
import { Label } from '@bish/ui/label'
import { LegalLinks } from '@/components/auth/sign-in/legal-links'
import {
  cardVariants,
  menuCardContainerVariants,
  menuCardHeaderVariants,
  staggerChildVariants,
} from '@/lib/shared/animations'
import { m } from '@/paraglide/messages.js'
import { selfHostSource } from '@/utils/app-feature-flags'
import { useSetupPageLogic } from './setup-page.logic'

const SETUP_TOKEN_INPUT_ID = 'setup-token'

export function SetupPage() {
  const isRailwaySelfHost = selfHostSource === 'railway'
  const {
    step,
    setupToken,
    name,
    email,
    password,
    confirmPassword,
    error,
    success,
    isVerifyingToken,
    isSubmittingAccount,
    isRedirectingToChat,
    setSetupToken,
    setName,
    setEmail,
    setPassword,
    setConfirmPassword,
    handleVerifyToken,
    handleSubmit,
  } = useSetupPageLogic()

  if (isRedirectingToChat) {
    return (
      <div className="relative grid w-full place-items-center">
        <motion.div
          className="w-full max-w-md rounded-3xl bg-surface-strong/30 p-8 text-center shadow-[0_0_1px_rgba(0,0,0,0.40),0_0_2px_rgba(0,0,0,0.05),0_10px_10px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-colors duration-200 dark:bg-surface-strong/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-black/70 dark:text-white/60">
            Redirecting to chat...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative grid w-full place-items-center">
      <AnimatePresence initial={false}>
        <motion.div
          key={`setup-step-${step}`}
          className="col-start-1 row-start-1 relative z-10 w-full max-w-md"
          variants={menuCardContainerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="mb-8 text-center"
            variants={menuCardHeaderVariants}
          >
            <h1 className="mb-4 text-3xl font-bold text-black dark:text-white">
              {step === 1
                ? m.setup_human_title()
                : m.setup_create_admin_title()}
            </h1>
            <p className="mb-6 text-lg text-black/70 dark:text-white/60">
              {step === 1
                ? isRailwaySelfHost
                  ? m.setup_railway_subtitle()
                  : m.setup_default_subtitle()
                : m.setup_create_admin_subtitle()}
            </p>
          </motion.div>

          <motion.div
            className="overflow-hidden rounded-3xl bg-surface-strong/30 shadow-[0_0_1px_rgba(0,0,0,0.40),0_0_2px_rgba(0,0,0,0.05),0_10px_10px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-colors duration-200 dark:bg-surface-strong/50"
            variants={cardVariants}
            layout
          >
            <motion.div
              className="rounded-b-3xl bg-surface-raised/70 p-8 shadow-[0_0_1px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-colors duration-200 dark:bg-surface-raised/60"
              layout
            >
              {step === 1 ? (
                <form
                  onSubmit={handleVerifyToken}
                  className="space-y-8 rounded-3xl"
                  autoComplete="on"
                >
                  <motion.div
                    variants={staggerChildVariants}
                    className="relative space-y-2"
                  >
                    <Label htmlFor="setup-token" variant="muted">
                      {m.setup_setup_token_label()}
                    </Label>
                    <Input
                      id={SETUP_TOKEN_INPUT_ID}
                      name="setup-token"
                      type="password"
                      variant="alt"
                      inputSize="large"
                      placeholder={m.setup_setup_token_placeholder()}
                      value={setupToken}
                      onChange={(event) => setSetupToken(event.target.value)}
                      autoComplete="one-time-code"
                      showPasswordToggle
                      required
                    />
                    <p className="text-xs text-black/55 dark:text-white/50">
                      {isRailwaySelfHost
                        ? m.setup_setup_token_help_railway()
                        : m.setup_setup_token_help_default()}
                    </p>
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {error ? (
                      <motion.p
                        key="setup-token-error"
                        variants={staggerChildVariants}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden text-sm text-red-500 dark:text-red-400"
                      >
                        {error}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  <motion.div variants={staggerChildVariants}>
                    <Button
                      type="submit"
                      variant="primaryAlt"
                      size="big"
                      disabled={isVerifyingToken}
                    >
                      {m.common_continue()}
                    </Button>
                  </motion.div>
                </form>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-8 rounded-3xl"
                  autoComplete="on"
                >
                  <motion.div
                    variants={staggerChildVariants}
                    className="relative space-y-2"
                  >
                    <Label htmlFor="setup-name" variant="muted">
                      {m.setup_name_label()}
                    </Label>
                    <Input
                      id="setup-name"
                      name="name"
                      variant="alt"
                      inputSize="large"
                      placeholder={m.setup_name_placeholder()}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      required
                    />
                  </motion.div>

                  <motion.div
                    variants={staggerChildVariants}
                    className="relative space-y-2"
                  >
                    <Label htmlFor="setup-email" variant="muted">
                      {m.setup_email_label()}
                    </Label>
                    <Input
                      id="setup-email"
                      name="email"
                      type="email"
                      variant="alt"
                      inputSize="large"
                      placeholder={m.setup_email_placeholder()}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="section-sign-up email"
                      required
                    />
                  </motion.div>

                  <motion.div
                    variants={staggerChildVariants}
                    className="relative space-y-2"
                  >
                    <Label htmlFor="setup-password" variant="muted">
                      {m.setup_password_label()}
                    </Label>
                    <Input
                      id="setup-password"
                      name="password"
                      type="password"
                      variant="alt"
                      inputSize="large"
                      placeholder={m.setup_password_placeholder()}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="section-sign-up new-password"
                      showPasswordToggle
                      required
                    />
                  </motion.div>

                  <motion.div
                    variants={staggerChildVariants}
                    className="relative space-y-2"
                  >
                    <Label htmlFor="setup-confirm-password" variant="muted">
                      {m.setup_confirm_password_label()}
                    </Label>
                    <Input
                      id="setup-confirm-password"
                      name="confirm-password"
                      type="password"
                      variant="alt"
                      inputSize="large"
                      placeholder={m.setup_confirm_password_placeholder()}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="section-sign-up new-password"
                      showPasswordToggle
                      required
                    />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {error ? (
                      <motion.p
                        key="setup-account-error"
                        variants={staggerChildVariants}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden text-sm text-red-500 dark:text-red-400"
                      >
                        {error}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {success ? (
                      <motion.p
                        key="setup-success"
                        variants={staggerChildVariants}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden text-sm text-foreground-success"
                      >
                        {success}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  <motion.div variants={staggerChildVariants}>
                    <Button
                      type="submit"
                      variant="primaryAlt"
                      size="big"
                      disabled={isSubmittingAccount}
                    >
                      {m.setup_create_account()}
                    </Button>
                  </motion.div>
                </form>
              )}
            </motion.div>
          </motion.div>

          <LegalLinks isSignUp />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
