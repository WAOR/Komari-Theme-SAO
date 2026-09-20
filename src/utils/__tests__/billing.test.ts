import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatBillingCycle,
  formatCompactRenewalPrice,
  formatRenewalPrice,
} from "@/utils/billing";

function inDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

describe("formatBillingCycle", () => {
  it("maps known day-counts to labels", () => {
    expect(formatBillingCycle(30)).toBe("月");
    expect(formatBillingCycle(90)).toBe("季");
    expect(formatBillingCycle(92)).toBe("季");
    expect(formatBillingCycle(180)).toBe("半年");
    expect(formatBillingCycle(182)).toBe("半年");
    expect(formatBillingCycle(365)).toBe("年");
    expect(formatBillingCycle(360)).toBe("年");
  });

  it("renders whole-year multiples in Komari Chinese naming", () => {
    expect(formatBillingCycle(730)).toBe("两年");
    expect(formatBillingCycle(1095)).toBe("三年");
    expect(formatBillingCycle(1460)).toBe("四年");
    expect(formatBillingCycle(1825)).toBe("五年");
  });

  it("treats -1 as an once/lifetime cycle", () => {
    expect(formatBillingCycle(-1)).toBe("一次性");
  });

  it("does not render unset cycles as 0天 (regression)", () => {
    expect(formatBillingCycle("")).toBe("年");
    expect(formatBillingCycle(null)).toBe("年");
    expect(formatBillingCycle(undefined)).toBe("年");
    expect(formatBillingCycle(0)).toBe("年");
  });

  it("maps textual cycles", () => {
    expect(formatBillingCycle("monthly")).toBe("月");
    expect(formatBillingCycle("年")).toBe("年");
    expect(formatBillingCycle("lifetime")).toBe("一次性");
    expect(formatBillingCycle("一次性付费")).toBe("一次性");
  });

  it("maps Chinese payment-cycle idioms (regression)", () => {
    expect(formatBillingCycle("月付")).toBe("月");
    expect(formatBillingCycle("季付")).toBe("季");
    expect(formatBillingCycle("半年付")).toBe("半年");
    expect(formatBillingCycle("年付")).toBe("年");
    expect(formatBillingCycle("Semi-Annually")).toBe("半年");
    expect(formatBillingCycle("semiannually")).toBe("半年");
  });

  it("falls back to a day-count for arbitrary positive numbers", () => {
    expect(formatBillingCycle(45)).toBe("45天");
  });
});

describe("formatRenewalPrice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders -1 prices as free", () => {
    expect(formatRenewalPrice({ price: -1, currency: "¥", billing_cycle: 365 })).toBe("免费");
  });

  it("renders zero prices as free only for long-term expiry", () => {
    expect(
      formatRenewalPrice({
        price: 0,
        currency: "¥",
        billing_cycle: 365,
        expired_at: inDays(40_000),
      }),
    ).toBe("免费");
    expect(
      formatRenewalPrice({
        price: 0,
        currency: "¥",
        billing_cycle: 365,
        expired_at: inDays(30),
      }),
    ).toBeNull();
  });

  it("renders positive prices with currency and billing cycle", () => {
    expect(formatRenewalPrice({ price: 10, currency: "$", billing_cycle: 30 })).toBe("$10/月");
    expect(formatRenewalPrice({ price: 19.9, currency: "¥", billing_cycle: -1 })).toBe("¥19.90/一次性");
    expect(formatRenewalPrice({ price: 71.08, currency: "$", billing_cycle: 1095 })).toBe("$71.08/三年");
    expect(formatRenewalPrice({ price: 120, currency: "¥", billing_cycle: 730 })).toBe("¥120/两年");
  });
});

describe("formatCompactRenewalPrice", () => {
  it("compacts currency codes into symbols and removes trailing zeroes", () => {
    expect(formatCompactRenewalPrice({ price: 4.5, currency: "CAD", billing_cycle: 365 })).toBe("C$4.5/年");
    expect(formatCompactRenewalPrice({ price: 5.8, currency: "USD", billing_cycle: 30 })).toBe("$5.8/月");
    expect(formatCompactRenewalPrice({ price: 71, currency: "USD", billing_cycle: 1095 })).toBe("$71/3年");
    expect(formatCompactRenewalPrice({ price: 71.08, currency: "USD", billing_cycle: 1095 })).toBe("$71.08/3年");
    expect(formatCompactRenewalPrice({ price: 18.6, currency: "USD", billing_cycle: 365 })).toBe("$18.6/年");
    expect(formatCompactRenewalPrice({ price: 4, currency: "USD", billing_cycle: 30 })).toBe("$4/月");
    expect(formatCompactRenewalPrice({ price: 19.9, currency: "CNY", billing_cycle: -1 })).toBe("¥19.9/一次");
  });
});
