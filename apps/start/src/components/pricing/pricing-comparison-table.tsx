import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { Button } from '@bish/ui/button'
import { cn } from '@bish/utils'
import {
  getEnterprisePlan,
  getMainPlans,
  getSelfHostingPlan,
} from '@/lib/shared/pricing'
import type { LandingPlan } from '@/lib/shared/pricing'
import {
  CardDashedBorder,
  DashedBorderFrame,
  GradientBackground,
} from './pricing-decorative'
import type { PricingPlanActionOverride } from './pricing-card'
import { m } from '@/paraglide/messages.js'

type ComparisonCell = string | boolean

type ComparisonRow = {
  label: string
  values: ComparisonCell[]
}

type ComparisonSection = {
  title: string
  rows: ComparisonRow[]
}

type ComparisonPlan = Pick<
  LandingPlan,
  'name' | 'buttonText' | 'href' | 'gradientId' | 'workspacePlanId'
>

/**
 * The matrix only compares the paid and custom plans. Free stays out of the
 * sticky header to keep the horizontal width focused on the tiers users are
 * actually choosing between at upgrade time.
 */
function getComparisonPlans(): ComparisonPlan[] {
  const mainPlans = getMainPlans()
  const enterprisePlan = getEnterprisePlan()
  const selfHostingPlan = getSelfHostingPlan()

  return [
    ...mainPlans
      .filter((plan) => plan.workspacePlanId !== 'free')
      .map(({ name, buttonText, href, gradientId, workspacePlanId }) => ({
        workspacePlanId,
        name,
        buttonText,
        href,
        gradientId,
      })),
    {
      workspacePlanId: enterprisePlan.workspacePlanId,
      name: enterprisePlan.name,
      buttonText: enterprisePlan.buttonText,
      href: enterprisePlan.href,
      gradientId: enterprisePlan.gradientId,
    },
    {
      workspacePlanId: selfHostingPlan.workspacePlanId,
      name: selfHostingPlan.name,
      buttonText: selfHostingPlan.buttonText,
      href: selfHostingPlan.href,
      gradientId: selfHostingPlan.gradientId,
    },
  ]
}

function getComparisonSections(): ComparisonSection[] {
  return [
    {
      title: m.pricing_comparison_section_essentials(),
      rows: [
        {
          label: m.pricing_comparison_row_monthly_limits(),
          values: [
            m.pricing_comparison_value_expanded(),
            m.pricing_comparison_value_5x_plus(),
            m.pricing_comparison_value_10x_plus(),
            m.pricing_comparison_value_custom_usage(),
            m.pricing_comparison_value_custom_usage(),
          ],
        },
        {
          label: m.pricing_comparison_row_chat_history(),
          values: [
            m.pricing_comparison_value_unlimited(),
            m.pricing_comparison_value_unlimited(),
            m.pricing_comparison_value_unlimited(),
            m.pricing_comparison_value_unlimited(),
            m.pricing_comparison_value_unlimited(),
          ],
        },
        {
          label: m.pricing_comparison_row_mobile_apps(),
          values: [true, true, true, true, true],
        },
        {
          label: m.pricing_comparison_row_priority_support(),
          values: [false, true, true, true, true],
        },
      ],
    },
    {
      title: m.pricing_comparison_section_workspace(),
      rows: [
        {
          label: m.pricing_comparison_row_model_access(),
          values: [
            m.pricing_comparison_value_all_models(),
            m.pricing_comparison_value_all_models(),
            m.pricing_comparison_value_all_models(),
            m.pricing_comparison_value_custom_catalog(),
            m.pricing_comparison_value_custom_deployment(),
          ],
        },
        {
          label: m.pricing_comparison_row_file_storage(),
          values: [
            m.pricing_comparison_value_included(),
            m.pricing_comparison_value_higher_limits(),
            m.pricing_comparison_value_highest_limits(),
            m.pricing_comparison_value_custom(),
            m.pricing_comparison_value_custom(),
          ],
        },
        {
          label: m.pricing_comparison_row_memory_projects(),
          values: [true, true, true, true, true],
        },
        {
          label: m.pricing_comparison_row_team_mgmt(),
          values: [true, true, true, true, true],
        },
        {
          label: m.pricing_comparison_row_byok(),
          values: [true, true, true, true, true],
        },
        {
          label: m.pricing_comparison_row_zdr_ai_providers(),
          values: [true, true, true, true, true],
        },
        {
          label: m.pricing_comparison_row_org_policies(),
          values: [true, true, true, true, true],
        },
        {
          label: m.pricing_comparison_row_sso(),
          values: [false, false, false, true, true],
        },
        {
          label: m.pricing_comparison_row_directory_sync(),
          values: [false, false, false, true, true],
        },
        {
          label: m.pricing_comparison_row_siem(),
          values: [false, false, false, true, true],
        },
        {
          label: m.pricing_comparison_row_usage_analytics(),
          values: [false, false, false, true, true],
        },
        {
          label: m.pricing_comparison_row_audit_logs(),
          values: [false, false, false, true, true],
        },
        {
          label: m.pricing_comparison_row_deployment(),
          values: [
            m.pricing_comparison_value_rift_cloud(),
            m.pricing_comparison_value_rift_cloud(),
            m.pricing_comparison_value_rift_cloud(),
            m.pricing_comparison_value_rift_cloud(),
            m.pricing_comparison_value_private_infrastructure(),
          ],
        },
        {
          label: m.pricing_comparison_row_tech_onboarding(),
          values: [false, false, false, true, true],
        },
      ],
    },
  ]
}

/**
 * Renders a comparison cell value. String values wrap to multiple lines;
 * booleans render as check or dash.
 */
function ComparisonValue({ value }: { value: ComparisonCell }) {
  if (typeof value === 'boolean') {
    if (!value) {
      return <span className="text-foreground-tertiary">-</span>
    }

    return (
      <span className="inline-flex items-center justify-center text-foreground-strong">
        <Check aria-hidden="true" className="size-4" />
        <span className="sr-only">Included</span>
      </span>
    )
  }

  return (
    <span className="block break-words whitespace-normal text-center">
      {value}
    </span>
  )
}

/**
 * Sticky comparison table that reuses the pricing-card border language. The
 * outer frame mirrors the card grid, while each sticky plan header is rendered
 * as a compact card so the section feels like part of the same pricing system.
 */
export function PricingComparisonTable(props: {
  resolvePlanAction?: (
    plan: Pick<LandingPlan, 'name' | 'workspacePlanId'>,
  ) => PricingPlanActionOverride | undefined
}) {
  const comparisonPlans = getComparisonPlans()
  const comparisonSections = getComparisonSections()
  return (
    <>
      <style>{`
        /**
         * Compact plan headers need the same restrained gradient wash as the
         * pricing cards, but the styling stays local so the table does not rely
         * on CSS declared in pricing-section.tsx.
         */
        .pricing-comparison__orb {
          opacity: 0.34;
          filter: saturate(1.08) brightness(0.98);
        }

        .dark .pricing-comparison__orb {
          opacity: 0.3;
          filter: saturate(1.08) brightness(1.05);
        }
      `}</style>

      <section
        aria-label="Pricing comparison"
        className="mx-auto mt-16 hidden w-full max-w-[1400px] lg:block"
      >
        <div className="relative mx-auto w-full max-md:px-4 max-md:py-4 max-lg:p-4 lg:p-12">
          <DashedBorderFrame>
            <div className="relative max-lg:mx-3.5 max-lg:my-3.5">
              <div className="">
                <table className="w-full min-w-[1120px] table-fixed border-collapse text-center text-sm text-foreground-primary">
                  <colgroup>
                    <col className="w-[280px]" style={{ width: 280 }} />
                    {comparisonPlans.map((plan) => (
                      <col
                        key={plan.name}
                        style={{
                          width: `calc((100% - 280px) / ${comparisonPlans.length})`,
                        }}
                      />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th
                        colSpan={comparisonPlans.length + 1}
                        className="sticky top-16 z-30 bg-surface-base/96 px-0 align-top backdrop-blur-md"
                      >
                        <div className="relative flex min-h-[100px] w-full bg-surface-base">
                          <CardDashedBorder />
                          <div className="flex w-full">
                            <div className="w-[280px] flex-shrink-0 px-6 pb-3 pt-6">
                              <span className="sr-only">
                                Feature comparison
                              </span>
                            </div>
                            <div
                              className="grid flex-1 gap-0"
                              style={{
                                gridTemplateColumns: `repeat(${comparisonPlans.length}, minmax(0, 1fr))`,
                              }}
                            >
                              {comparisonPlans.map((plan) => {
                                const actionOverride =
                                  props.resolvePlanAction?.(plan)
                                const buttonText =
                                  actionOverride?.buttonText ?? plan.buttonText
                                const href = actionOverride?.href ?? plan.href
                                const isDisabled =
                                  actionOverride?.disabled ?? false
                                const handleSelect = actionOverride?.onSelect

                                return (
                                  <div
                                    key={plan.name}
                                    className="relative px-4 py-3"
                                  >
                                    <GradientBackground
                                      id={plan.gradientId}
                                      className="pricing-comparison__orb"
                                    />

                                    <div className="relative z-[1] flex h-full flex-col items-center gap-3">
                                      <span className="text-lg font-medium tracking-tight text-foreground-strong">
                                        {plan.name}
                                      </span>
                                      {handleSelect ? (
                                        <Button
                                          variant="outline"
                                          size="default"
                                          className="mt-auto"
                                          type="button"
                                          disabled={isDisabled}
                                          onClick={() => void handleSelect()}
                                        >
                                          {buttonText}
                                        </Button>
                                      ) : href.startsWith('mailto:') ? (
                                        <Button
                                          variant="outline"
                                          size="default"
                                          className="mt-auto"
                                          asChild
                                        >
                                          <a href={href}>{buttonText}</a>
                                        </Button>
                                      ) : isDisabled ? (
                                        <Button
                                          variant="outline"
                                          size="default"
                                          className="mt-auto"
                                          type="button"
                                          disabled
                                        >
                                          {buttonText}
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="default"
                                          className="mt-auto"
                                          asChild
                                        >
                                          <Link to={href}>{buttonText}</Link>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonSections.map((section, sectionIndex) => (
                      <Fragment key={section.title}>
                        <tr>
                          <th
                            colSpan={comparisonPlans.length + 1}
                            className={cn(
                              'px-6 pb-5 text-left text-2xl font-semibold text-foreground-strong',
                              sectionIndex === 0 ? 'pt-2' : 'pt-8',
                            )}
                          >
                            {section.title}
                          </th>
                        </tr>

                        {section.rows.map((row) => (
                          <tr key={`${section.title}-${row.label}`}>
                            <th
                              scope="row"
                              className="w-[280px] max-w-[280px] border-b border-border-base/70 px-6 py-5 text-left align-top font-medium text-foreground-strong break-words whitespace-normal"
                            >
                              {row.label}
                            </th>
                            {row.values.map((value, index) => (
                              <td
                                key={`${row.label}-${comparisonPlans[index]?.name ?? index}`}
                                className="border-b border-border-base/70 px-5 py-5 align-top break-words"
                              >
                                <ComparisonValue value={value} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DashedBorderFrame>
        </div>
      </section>
    </>
  )
}
