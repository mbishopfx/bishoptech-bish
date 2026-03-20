'use client'

import { Link } from '@tanstack/react-router'
import { Button } from '@rift/ui/button'
import { cn } from '@rift/utils'
import {
  CardDashedBorder,
  GradientBackground,
} from '@/components/pricing/pricing-decorative'
import { m } from '@/paraglide/messages.js'

type ChatSidebarUpgradeCtaProps = {
  className?: string
}

/**
 * Sidebar upgrade card shown to free workspaces in chat.
 *
 * The card intentionally mirrors the `/pricing` plan cards so the upgrade path
 * feels like the same product surface, only adapted into a tighter, more
 * action-oriented CTA for the sidebar. The shared colors, border treatment,
 * orb, and button styling stay consistent with `PricingCard`, while the layout
 * shifts to a centered, more promotional prompt that reads faster in a compact
 * rail.
 */
export function ChatSidebarUpgradeCta({
  className,
}: ChatSidebarUpgradeCtaProps) {
  return (
    <>
      <style>{`
        /**
         * Replicates the pricing card orb treatment locally because the shared
         * pricing section styles are scoped to that page. Keeping the animation
         * here ensures the sidebar CTA renders with the same visual behavior.
         */
        @keyframes chat-sidebar-upgrade-orb-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1.08) rotate(0deg);
          }
          25% {
            transform: translate3d(4%, -3%, 0) scale(1.14) rotate(6deg);
          }
          50% {
            transform: translate3d(-3%, 4%, 0) scale(1.18) rotate(-4deg);
          }
          75% {
            transform: translate3d(3%, 2%, 0) scale(1.15) rotate(3deg);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1.08) rotate(0deg);
          }
        }

        .chat-sidebar-upgrade-card__orb {
          opacity: 0.56;
          filter: saturate(1.08) brightness(0.97) blur(0px);
          mix-blend-mode: multiply;
          transform: scale(1);
          transform-origin: center;
          transition:
            opacity 320ms ease,
            filter 420ms ease,
            transform 420ms ease;
        }

        .chat-sidebar-upgrade-card:hover .chat-sidebar-upgrade-card__orb,
        .chat-sidebar-upgrade-card:focus-within .chat-sidebar-upgrade-card__orb {
          opacity: 0.9;
          filter: saturate(1.48) brightness(0.94) contrast(1.08) blur(9px);
          transform: scale(1.07);
          animation: chat-sidebar-upgrade-orb-drift 7s ease-in-out infinite;
        }

        .dark .chat-sidebar-upgrade-card__orb {
          opacity: 0.42;
          filter: saturate(1.05) blur(0px);
          mix-blend-mode: screen;
        }

        .dark .chat-sidebar-upgrade-card:hover .chat-sidebar-upgrade-card__orb,
        .dark
          .chat-sidebar-upgrade-card:focus-within
          .chat-sidebar-upgrade-card__orb {
          opacity: 1;
          filter: saturate(1.45) brightness(1.18) blur(10px);
        }
      `}</style>

      <article
        aria-labelledby="chat-sidebar-upgrade-title"
        className={cn(
          'chat-sidebar-upgrade-card relative z-[2] flex flex-col gap-5 overflow-hidden bg-surface-base px-5 py-5',
          className,
        )}
      >
        <CardDashedBorder />
        <GradientBackground id="2" className="chat-sidebar-upgrade-card__orb" />

        <div className="relative z-[1] flex flex-col gap-3 text-center">
          <div className="space-y-3">
            <h3
              id="chat-sidebar-upgrade-title"
              className="mx-auto max-w-[15rem] text-lg font-semibold leading-6 tracking-tight text-foreground-strong"
            >
              {m.chat_sidebar_upgrade_title()}
            </h3>
            <p className="mx-auto max-w-[17rem] text-sm leading-6 text-foreground-secondary">
              {m.chat_sidebar_upgrade_description()}
            </p>
          </div>
        </div>

        <footer className="relative z-[1] mt-auto w-full">
          <Button variant="outline" size="large" className="w-full" asChild>
            <Link to="/pricing" preload="intent">
              {m.chat_sidebar_upgrade_cta()}
            </Link>
          </Button>
        </footer>
      </article>
    </>
  )
}
