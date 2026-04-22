/**
 * Pricing plan definitions for the app.
 *
 * Each feature has an explicit iconId so the UI can render varied, semantic icons
 * (no standalone arrow or repeated icons within a plan). Icon IDs map to components
 * in pricing-icons.tsx.
 */

import { m } from '@/paraglide/messages.js'
import type { WorkspacePlanId } from '@/lib/shared/access-control'

/** Icon identifiers for feature list items. Matches icons in pricing-icons.tsx. */
export type FeatureIconId =
  | 'standard'
  | 'premium'
  | 'ai-models'
  | 'support'
  | 'expand'
  | 'sso'
  | 'logs'
  | 'teams'
  | 'shield'
  | 'check'
  | 'directory-sync'
  | 'onboarding'
  | 'analytics'
  | 'image'
  | 'message'

export type PricingFeature = {
  text: string
  iconId: FeatureIconId
}

export type LandingPlan = {
  /** Stable internal plan id used by billing and pricing actions. */
  workspacePlanId?: WorkspacePlanId
  name: string
  priceAmount: number | null
  currency: 'MXN' | 'USD'
  /** USD amount for English locale; when set, /en uses this with currency USD */
  usdPriceAmount?: number | null
  billingPeriodLabel?: string
  /** English billing period label (e.g. "mo") when showing USD */
  billingPeriodLabelEn?: string
  description: string
  /** Short line that frames the feature list as a plan upgrade, not a full spec dump. */
  featureIntro?: string
  features: PricingFeature[]
  buttonText: string
  href: string
  popular?: boolean
  gradientId: '1' | '2' | '3' | '4' | '5' | '6'
  setupFeeUsd?: number | null
  /** When true, renders below the main plans row as a standalone card */
  isEnterprise?: boolean
}

/** Main pricing plans: Free, $7.99, $50, $100 - displayed in a row */
export function getMainPlans(): LandingPlan[] {
  return [
    {
      workspacePlanId: 'free',
      name: 'Free / Trial',
      priceAmount: 0,
      currency: 'USD',
      usdPriceAmount: 0,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: 'Invite-only trial for demos, internal evaluation, and early customer proofs.',
      featureIntro: 'Best for proving the workflow before a paid rollout.',
      features: [
        {
          text: 'Curated model lane only',
          iconId: 'message',
        },
        {
          text: 'Short trial or internal sandbox',
          iconId: 'ai-models',
        },
        {
          text: 'No local listener handoff',
          iconId: 'support',
        },
      ],
      buttonText: m.pricing_cta_get_started(),
      href: '/auth/sign-up?plan=free',
      gradientId: '1',
    },
    {
      workspacePlanId: 'plus',
      name: 'Starter',
      priceAmount: 499,
      currency: 'USD',
      usdPriceAmount: 499,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: 'ARCH3R for small businesses that need Google-backed RAG, approvals, and one listener bridge.',
      featureIntro: 'Includes 5 seats and a bundled AI budget for light daily usage.',
      setupFeeUsd: 2_000,
      features: [
        {
          text: 'Google Workspace sync + Drive Picker RAG',
          iconId: 'premium',
        },
        {
          text: 'File upload RAG and approval gates',
          iconId: 'ai-models',
        },
        { text: '1 local listener included', iconId: 'logs' },
        { text: '5 seats included', iconId: 'teams' },
        { text: '$50/mo bundled AI budget', iconId: 'shield' },
        { text: '$39/seat/mo extra seats', iconId: 'shield' },
        { text: 'BYOK and org policies', iconId: 'shield' },
      ],
      buttonText: m.pricing_cta_get_started(),
      href: '/auth/sign-up?plan=plus',
      gradientId: '2',
    },
    {
      workspacePlanId: 'pro',
      name: 'Growth',
      priceAmount: 1_499,
      currency: 'USD',
      usdPriceAmount: 1_499,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: 'Sales-led workspace for teams that want the full model catalog, listener handoff, and stronger automation budgets.',
      featureIntro: 'Includes 15 seats and a larger bundled AI allowance before overages.',
      setupFeeUsd: 5_000,
      features: [
        { text: 'Full model catalog', iconId: 'premium' },
        { text: 'Listener handoff + activity loop', iconId: 'support' },
        { text: '15 seats included', iconId: 'teams' },
        { text: '$250/mo bundled AI budget', iconId: 'shield' },
        { text: '$29/seat/mo extra seats', iconId: 'shield' },
      ],
      buttonText: m.pricing_cta_get_pro(),
      href: '/auth/sign-up?plan=pro',
      popular: true,
      gradientId: '3',
    },
    {
      workspacePlanId: 'scale',
      name: 'Business',
      priceAmount: 3_500,
      currency: 'USD',
      usdPriceAmount: 3_500,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: 'Operational deployment for larger teams that need multiple listeners, richer controls, and higher ingestion throughput.',
      featureIntro: 'Includes 40 seats and a larger included AI budget for heavier workflows.',
      setupFeeUsd: 10_000,
      features: [
        { text: 'Multiple local listeners', iconId: 'premium' },
        { text: '40 seats included', iconId: 'teams' },
        { text: 'Higher sync and ingestion quotas', iconId: 'analytics' },
        { text: '$1,000/mo bundled AI budget', iconId: 'shield' },
        { text: '$24/seat/mo extra seats', iconId: 'shield' },
      ],
      buttonText: m.pricing_cta_get_scale(),
      href: '/auth/sign-up?plan=scale',
      gradientId: '4',
    },
  ]
}

/** Enterprise plan - displayed in separate section below main plans */
export function getEnterprisePlan(): LandingPlan {
  return {
    workspacePlanId: 'enterprise',
    name: 'Enterprise',
    priceAmount: null,
    currency: 'USD',
    description: 'Custom deployment, custom AI budget, security controls, and white-glove rollout support.',
    featureIntro: 'Best for regulated teams, custom procurement, or hybrid / on-prem requirements.',
    setupFeeUsd: 20_000,
    features: [
      {
        text: 'Custom AI budget or BYOK hybrid',
        iconId: 'premium',
      },
      {
        text: 'Custom model catalog and controls',
        iconId: 'ai-models',
      },
      { text: 'SSO and security controls', iconId: 'sso' },
      {
        text: 'Directory sync, audit, and analytics',
        iconId: 'directory-sync',
      },
      {
        text: 'SLA and custom onboarding',
        iconId: 'analytics',
      },
      { text: 'On-prem / private infrastructure options', iconId: 'shield' },
    ],
    buttonText: m.pricing_cta_contact_sales(),
    href: 'mailto:sales@arch3r.local',
    gradientId: '5',
    isEnterprise: true,
  }
}

/** Self-hosting plan - on-premise deployment */
export function getSelfHostingPlan(): LandingPlan {
  return {
    name: m.pricing_plan_on_prem_name(),
    priceAmount: null,
    currency: 'USD',
    description: m.pricing_plan_on_prem_description(),
    featureIntro: m.pricing_plan_on_prem_feature_intro(),
    features: [
      {
        text: m.pricing_plan_on_prem_feature_data_environment(),
        iconId: 'shield',
      },
      {
        text: m.pricing_plan_on_prem_feature_deploy_on_prem(),
        iconId: 'expand',
      },
      {
        text: m.pricing_plan_on_prem_feature_custom_deployment(),
        iconId: 'ai-models',
      },
      { text: m.pricing_plan_on_prem_feature_air_gapped(), iconId: 'shield' },
      {
        text: m.pricing_plan_on_prem_feature_volume_licensing(),
        iconId: 'premium',
      },
      {
        text: m.pricing_plan_on_prem_feature_onboarding(),
        iconId: 'onboarding',
      },
    ],
    buttonText: m.pricing_cta_get_in_touch(),
    href: 'mailto:enterprise@arch3r.local',
    gradientId: '6',
  }
}
