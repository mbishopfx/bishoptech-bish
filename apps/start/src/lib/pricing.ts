/**
 * Pricing plan definitions for the app.
 *
 * Each feature has an explicit iconId so the UI can render varied, semantic icons
 * (no standalone arrow or repeated icons within a plan). Icon IDs map to components
 * in pricing-icons.tsx.
 */

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
export const mainPlans: LandingPlan[] = [
  {
    name: 'Free',
    priceAmount: 0,
    currency: 'USD',
    usdPriceAmount: 0,
    billingPeriodLabel: 'mo',
    billingPeriodLabelEn: 'mo',
    description: 'Try Rift with the essentials for everyday AI tasks.',
    featureIntro: 'Includes:',
    features: [
      { text: 'A small monthly message allowance', iconId: 'message' },
      { text: 'Core model access', iconId: 'ai-models' },
      { text: 'Community support', iconId: 'support' },
    ],
    buttonText: 'Get started',
    href: '/auth/sign-up?plan=free',
    gradientId: '1',
  },
  {
    name: 'Plus',
    priceAmount: 8,
    currency: 'USD',
    usdPriceAmount: 8,
    billingPeriodLabel: 'mo',
    billingPeriodLabelEn: 'mo',
    description: 'For people who want the full Rift experience at personal scale.',
    featureIntro: 'Everything in Free, plus:',
    features: [
      { text: 'Increase usage limits', iconId: 'premium' },
      { text: 'Full model access', iconId: 'ai-models' },
      { text: 'Unlimited chat history', iconId: 'logs' },
      { text: 'Team management', iconId: 'teams' },
      { text: 'BYOK', iconId: 'shield' },
    ],
    buttonText: 'Get started',
    href: '/auth/sign-up?plan=starter',
    gradientId: '2',
  },
  {
    name: 'Pro',
    priceAmount: 50,
    currency: 'USD',
    usdPriceAmount: 50,
    billingPeriodLabel: 'mo',
    billingPeriodLabelEn: 'mo',
    description: 'For heavier workloads that need more capacity and faster support.',
    featureIntro: 'Everything in Plus, plus:',
    features: [
      { text: '5x more monthly usage', iconId: 'premium' },
      { text: 'Priority support', iconId: 'support' },
      { text: 'Fine-grained organization policies', iconId: 'shield' },
    ],
    buttonText: 'Get Pro',
    href: '/auth/sign-up?plan=pro',
    popular: true,
    gradientId: '3',
  },
  {
    name: 'Scale',
    priceAmount: 100,
    currency: 'USD',
    usdPriceAmount: 100,
    billingPeriodLabel: 'mo',
    billingPeriodLabelEn: 'mo',
    description: 'For operators and larger teams that need headroom for broad adoption.',
    featureIntro: 'Everything in Pro, plus:',
    features: [
      { text: '10x more monthly usage', iconId: 'premium' },
      { text: 'Built for larger team rollouts', iconId: 'teams' },
      { text: 'SAML SSO', iconId: 'sso' },
    ],
    buttonText: 'Get Scale',
    href: '/auth/sign-up?plan=team',
    gradientId: '4',
  },
]

/** Enterprise plan - displayed in separate section below main plans */
export const enterprisePlan: LandingPlan = {
  name: 'Enterprise',
  priceAmount: null,
  currency: 'USD',
  description: 'For organizations that need tailored security, scale, and support.',
  featureIntro: 'Everything in Scale, plus:',
  features: [
    { text: 'Usage limits shaped to your rollout', iconId: 'premium' },
    { text: 'Custom model catalog', iconId: 'ai-models' },
    { text: 'Single sign-on (SSO)', iconId: 'sso' },
    { text: 'ZDR', iconId: 'shield' },
    { text: 'Directory Sync, SIEM, Audit logs', iconId: 'directory-sync' },
    { text: 'Usage Analytics', iconId: 'analytics' },
    { text: 'Uptime SLA', iconId: 'shield' },
  ],
  buttonText: 'Contact Sales',
  href: 'mailto:sales@rift.mx',
  gradientId: '5',
  isEnterprise: true,
}

/** Self-hosting plan - on-premise deployment */
export const selfHostingPlan: LandingPlan = {
  name: 'Self-Hosting',
  priceAmount: null,
  currency: 'USD',
  description: 'For regulated or security-sensitive deployments on your own stack.',
  featureIntro: 'Designed for infrastructure control:',
  features: [
    { text: 'Keep data in your environment', iconId: 'shield' },
    { text: 'Deploy on-prem or in a private cloud', iconId: 'expand' },
    { text: 'Custom model deployment', iconId: 'ai-models' },
    { text: 'Air-gapped installation options', iconId: 'shield' },
    { text: 'Volume licensing', iconId: 'premium' },
    { text: 'Technical onboarding', iconId: 'onboarding' },
  ],
  buttonText: 'Get in Touch',
  href: 'mailto:enterprise@rift.mx',
  gradientId: '6',
}
