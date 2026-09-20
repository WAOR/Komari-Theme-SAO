import { describe, expect, it } from "vitest";
import type { PingOverviewBucket } from "@/types/komari";
import {
  formatCompactBillingCycle,
  formatCompactExpire,
  healthBarInteractionModel,
  healthBarSlotModel,
} from "@/components/node/nodeCardShared";

function bucket(value: number | null, loss: number | null = 0): PingOverviewBucket {
  return {
    index: 0,
    value,
    loss,
    total: value == null ? 0 : 1,
    lost: 0,
    startAt: null,
    endAt: null,
  };
}

describe("healthBarSlotModel", () => {
  it("keeps every valid latency bucket at one height while color carries severity", () => {
    const values = [0, 20, 55, 88.5, 151, 400];
    const slots = values.map((value) => healthBarSlotModel(bucket(value), "latency"));

    expect(slots.every((slot) => slot.active)).toBe(true);
    expect(new Set(slots.map((slot) => slot.heightFraction))).toEqual(new Set([0.84]));
    expect(slots.map((slot) => slot.color)).toEqual([
      "var(--latency-excellent)",
      "var(--latency-excellent)",
      "var(--latency-excellent)",
      "var(--latency-good)",
      "var(--latency-moderate)",
      "var(--latency-critical)",
    ]);
  });

  it("renders missing latency as a short neutral gap", () => {
    expect(healthBarSlotModel(bucket(null, null), "latency")).toMatchObject({
      active: false,
      heightFraction: 0.25,
      color: "var(--progress-bg)",
    });
  });

  it("keeps loss buckets on the same fixed-height visual language", () => {
    expect(healthBarSlotModel(bucket(20), "latency")).toMatchObject({
      active: true,
      heightFraction: 0.84,
      alpha: 0.94,
    });
    expect(healthBarSlotModel(bucket(20, 12.5), "loss")).toMatchObject({
      active: true,
      heightFraction: 0.84,
      alpha: 0.94,
    });
  });

  it("uses the shared hover lift and sibling fade for canvas renderers", () => {
    const slot = healthBarSlotModel(bucket(55), "latency");

    expect(healthBarInteractionModel(slot, true, 1)).toMatchObject({
      heightFraction: 1,
      alpha: 1,
    });
    expect(healthBarInteractionModel(slot, false, 1).alpha).toBeCloseTo(slot.alpha * 0.54);
    expect(healthBarInteractionModel(slot, true, 0)).toMatchObject({
      heightFraction: slot.heightFraction,
      alpha: slot.alpha,
    });
  });
});

describe("formatCompactExpire", () => {
  it("formats standard days correctly", () => {
    expect(formatCompactExpire({ value: "30", unit: "天" })).toBe("余 30天");
  });

  it("handles missing expiration sentinel", () => {
    expect(formatCompactExpire({ value: "—", unit: "" })).toBe("余 --");
  });
});

describe("formatCompactBillingCycle", () => {
  it("formats standard cycles correctly", () => {
    expect(formatCompactBillingCycle("month")).toBe("月付");
    expect(formatCompactBillingCycle(30)).toBe("月付");
    expect(formatCompactBillingCycle("quarter")).toBe("季付");
    expect(formatCompactBillingCycle(90)).toBe("季付");
    expect(formatCompactBillingCycle("half_year")).toBe("半年付");
    expect(formatCompactBillingCycle(180)).toBe("半年付");
    expect(formatCompactBillingCycle("year")).toBe("年付");
    expect(formatCompactBillingCycle(365)).toBe("年付");
    expect(formatCompactBillingCycle("two_years")).toBe("两年付");
    expect(formatCompactBillingCycle(730)).toBe("两年付");
    expect(formatCompactBillingCycle("三年付")).toBe("三年付");
    expect(formatCompactBillingCycle("three_years")).toBe("三年付");
    expect(formatCompactBillingCycle(1095)).toBe("三年付");
    expect(formatCompactBillingCycle(92)).toBe("季付");
    expect(formatCompactBillingCycle("four_years")).toBe("四年付");
    expect(formatCompactBillingCycle(1460)).toBe("四年付");
    expect(formatCompactBillingCycle("five_years")).toBe("五年付");
    expect(formatCompactBillingCycle(1825)).toBe("五年付");
    expect(formatCompactBillingCycle("lifetime")).toBe("一次性付费");
    expect(formatCompactBillingCycle(-1)).toBe("一次性付费");
    expect(formatCompactBillingCycle(45)).toBe("45天");
  });

  it("handles free price sentinel", () => {
    expect(formatCompactBillingCycle("year", -1)).toBe("免费");
  });

  it("falls back to 年付 for invalid or empty cycle values", () => {
    expect(formatCompactBillingCycle("")).toBe("年付");
    expect(formatCompactBillingCycle(null)).toBe("年付");
    expect(formatCompactBillingCycle(undefined)).toBe("年付");
  });
});
