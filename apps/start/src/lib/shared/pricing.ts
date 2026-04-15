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
  /** When true, renders below the main plans row as a standalone card */
  isEnterprise?: boolean
}

/** Main pricing plans: Free, $7.99, $50, $100 - displayed in a row */
export function getMainPlans(): LandingPlan[] {
  return [
    {
      workspacePlanId: 'free',
      name: m.pricing_plan_free_name(),
      priceAmount: 0,
      currency: 'USD',
      usdPriceAmount: 0,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: m.pricing_plan_free_description(),
      featureIntro: m.pricing_plan_free_feature_intro(),
      features: [
        {
          text: m.pricing_plan_free_feature_message_allowance(),
          iconId: 'message',
        },
        {
          text: m.pricing_plan_free_feature_core_models(),
          iconId: 'ai-models',
        },
        {
          text: m.pricing_plan_free_feature_community_support(),
          iconId: 'support',
        },
      ],
      buttonText: m.pricing_cta_get_started(),
      href: '/auth/sign-up?plan=free',
      gradientId: '1',
    },
    {
      workspacePlanId: 'plus',
      name: m.pricing_plan_plus_name(),
      priceAmount: 8,
      currency: 'USD',
      usdPriceAmount: 8,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: m.pricing_plan_plus_description(),
      featureIntro: m.pricing_plan_plus_feature_intro(),
      features: [
        {
          text: m.pricing_plan_plus_feature_increase_limits(),
          iconId: 'premium',
        },
        {
          text: m.pricing_plan_plus_feature_full_models(),
          iconId: 'ai-models',
        },
        { text: m.pricing_plan_plus_feature_chat_history(), iconId: 'logs' },
        { text: m.pricing_plan_plus_feature_team_mgmt(), iconId: 'teams' },
        { text: m.pricing_plan_plus_feature_byok(), iconId: 'shield' },
        { text: m.pricing_plan_plus_feature_org_policies(), iconId: 'shield' },
        { text: m.pricing_plan_plus_feature_zdr(), iconId: 'shield' },
      ],
      buttonText: m.pricing_cta_get_started(),
      href: '/auth/sign-up?plan=starter',
      gradientId: '2',
    },
    {
      workspacePlanId: 'pro',
      name: m.pricing_plan_pro_name(),
      priceAmount: 50,
      currency: 'USD',
      usdPriceAmount: 50,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: m.pricing_plan_pro_description(),
      featureIntro: m.pricing_plan_pro_feature_intro(),
      features: [
        { text: m.pricing_plan_pro_feature_5x_usage(), iconId: 'premium' },
        {
          text: m.pricing_plan_pro_feature_priority_support(),
          iconId: 'support',
        },
      ],
      buttonText: m.pricing_cta_get_pro(),
      href: '/auth/sign-up?plan=pro',
      popular: true,
      gradientId: '3',
    },
    {
      workspacePlanId: 'scale',
      name: m.pricing_plan_scale_name(),
      priceAmount: 100,
      currency: 'USD',
      usdPriceAmount: 100,
      billingPeriodLabel: m.pricing_billing_period_mo(),
      billingPeriodLabelEn: 'mo',
      description: m.pricing_plan_scale_description(),
      featureIntro: m.pricing_plan_scale_feature_intro(),
      features: [
        { text: m.pricing_plan_scale_feature_10x_usage(), iconId: 'premium' },
        { text: m.pricing_plan_scale_feature_team_rollouts(), iconId: 'teams' },
      ],
      buttonText: m.pricing_cta_get_scale(),
      href: '/auth/sign-up?plan=team',
      gradientId: '4',
    },
  ]
}

/** Enterprise plan - displayed in separate section below main plans */
export function getEnterprisePlan(): LandingPlan {
  return {
    workspacePlanId: 'enterprise',
    name: m.pricing_plan_enterprise_name(),
    priceAmount: null,
    currency: 'USD',
    description: m.pricing_plan_enterprise_description(),
    featureIntro: m.pricing_plan_enterprise_feature_intro(),
    features: [
      {
        text: m.pricing_plan_enterprise_feature_usage_shaped(),
        iconId: 'premium',
      },
      {
        text: m.pricing_plan_enterprise_feature_custom_catalog(),
        iconId: 'ai-models',
      },
      { text: m.pricing_plan_enterprise_feature_sso(), iconId: 'sso' },
      {
        text: m.pricing_plan_enterprise_feature_directory_siem_audit(),
        iconId: 'directory-sync',
      },
      {
        text: m.pricing_plan_enterprise_feature_analytics(),
        iconId: 'analytics',
      },
      { text: m.pricing_plan_enterprise_feature_sla(), iconId: 'shield' },
    ],
    buttonText: m.pricing_cta_contact_sales(),
    href: 'mailto:sales@rift.mx',
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
    href: 'mailto:enterprise@rift.mx',
    gradientId: '6',
  }
}
