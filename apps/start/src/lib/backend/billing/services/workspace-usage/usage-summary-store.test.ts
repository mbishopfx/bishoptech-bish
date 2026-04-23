import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectSeatCycleBucket } from './usage-summary-store'
import {
  CHAT_USAGE_FEATURE_KEY,
  resolveDefaultUsagePolicyTemplate,
  resolveUsagePolicySnapshot,
  usdToNanoUsd,
} from './shared'
import type { UsagePolicySnapshot } from './shared'

function stubUsagePolicyEnv(): void {
  vi.stubEnv('WORKSPACE_USAGE_TARGET_MARGIN_PERCENT', '25')
}

beforeEach(() => {
  stubUsagePolicyEnv()
})

function buildUsagePolicySnapshot(
  overrides: Partial<UsagePolicySnapshot> = {},
): UsagePolicySnapshot {
  return {
    featureKey: CHAT_USAGE_FEATURE_KEY,
    enabled: true,
    planId: 'plus',
    targetMarginRatioBps: 2500,
    reserveHeadroomRatioBps: 1000,
    minReserveNanoUsd: 5_000_000,
    seatPriceUsd: 8,
    organizationMonthlyBudgetNanoUsd: usdToNanoUsd(10),
    hasOrganizationMonthlyBudgetOverride: false,
    seatMonthlyBudgetNanoUsd: usdToNanoUsd(10),
    seatCycleBudgetNanoUsd: usdToNanoUsd(4),
    ...overrides,
  }
}

describe('projectSeatCycleBucket', () => {
  it('re-prorates the cycle reserve without overstating remaining balance', () => {
    const usagePolicy = resolveUsagePolicySnapshot(
      'plus',
      resolveDefaultUsagePolicyTemplate('plus'),
    )
    const cycleStartAt = Date.UTC(2026, 2, 1, 0, 0, 0)
    const cycleEndAt = Date.UTC(2026, 3, 1, 0, 0, 0)

    expect(
      projectSeatCycleBucket({
        totalNanoUsd: usdToNanoUsd(6),
        remainingNanoUsd: usdToNanoUsd(4),
        cycleStartAt,
        cycleEndAt,
        usagePolicy,
        now: Date.UTC(2026, 2, 16, 0, 0, 0),
      }),
    ).toEqual({
      totalNanoUsd: 19_354_838_710,
      remainingNanoUsd: 17_354_838_710,
    })
  })

  it('never projects a negative remaining balance', () => {
    const usagePolicy = resolveUsagePolicySnapshot(
      'plus',
      resolveDefaultUsagePolicyTemplate('plus'),
    )

    expect(
      projectSeatCycleBucket({
        totalNanoUsd: usdToNanoUsd(6),
        remainingNanoUsd: -usdToNanoUsd(3),
        cycleStartAt: Date.UTC(2026, 2, 1, 0, 0, 0),
        cycleEndAt: Date.UTC(2026, 3, 1, 0, 0, 0),
        usagePolicy,
        now: Date.UTC(2026, 2, 16, 0, 0, 0),
      }),
    ).toEqual({
      totalNanoUsd: 19_354_838_710,
      remainingNanoUsd: 10_354_838_710,
    })
  })

  it('reconciles an in-cycle budget change without refilling consumed spend', () => {
    const usagePolicy = buildUsagePolicySnapshot({
      seatCycleBudgetNanoUsd: usdToNanoUsd(8),
    })
    const previousUsagePolicy = buildUsagePolicySnapshot({
      seatCycleBudgetNanoUsd: usdToNanoUsd(6),
    })
    const now = Date.UTC(2026, 2, 18, 10, 15, 0)

    expect(
      projectSeatCycleBucket({
        totalNanoUsd: previousUsagePolicy.seatCycleBudgetNanoUsd,
        remainingNanoUsd: usdToNanoUsd(2),
        cycleStartAt: Date.UTC(2026, 2, 1, 0, 0, 0),
        cycleEndAt: Date.UTC(2026, 3, 1, 0, 0, 0),
        usagePolicy,
        now,
      }),
    ).toEqual({
      totalNanoUsd: Math.round(
        usagePolicy.seatCycleBudgetNanoUsd
          * (Date.UTC(2026, 3, 1, 0, 0, 0) - now)
          / (Date.UTC(2026, 3, 1, 0, 0, 0) - Date.UTC(2026, 2, 1, 0, 0, 0)),
      ),
      remainingNanoUsd: 0,
    })
  })
})
