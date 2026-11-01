import { describe, expect, it } from "vitest";
import {
  getOverviewRating,
  normalizeOverviewRatingLabels,
} from "@/utils/overviewRating";

describe("overview ratings", () => {
  it("rates bandwidth on native byte inputs", () => {
    // 672 Kbps <= 1 Mbps -> level 0 (IDLE)
    expect(getOverviewRating({ kind: "bandwidth", value: (672 * 1024) / 8 })).toEqual({
      level: 0,
      label: "IDLE",
    });
    // 5 Mbps <= 10 Mbps -> level 1 (LIGHT)
    expect(getOverviewRating({ kind: "bandwidth", value: (5 * 1_000_000) / 8 })).toEqual({
      level: 1,
      label: "LIGHT",
    });
    // 50 Mbps <= 100 Mbps -> level 2 (ACTIVE)
    expect(getOverviewRating({ kind: "bandwidth", value: (50 * 1_000_000) / 8 })).toEqual({
      level: 2,
      label: "ACTIVE",
    });
    // 150 Mbps > 100 Mbps -> level 3 (SURGE)
    expect(getOverviewRating({ kind: "bandwidth", value: (150 * 1_000_000) / 8 })).toEqual({
      level: 3,
      label: "SURGE",
    });
  });

  it("accepts custom comma-separated labels and only takes the first four", () => {
    expect(normalizeOverviewRatingLabels("bandwidth", "空闲,轻载,活跃,激增,超载")).toEqual([
      "空闲",
      "轻载",
      "活跃",
      "激增",
    ]);
  });

  it("applies custom labels to the resolved rating", () => {
    expect(
      getOverviewRating({
        kind: "bandwidth",
        value: (50 * 1_000_000) / 8,
        customLabels: "空闲,轻微,高载,满载",
      }),
    ).toEqual({
      level: 2,
      label: "高载",
    });
  });

  it("falls back by position when custom labels are incomplete", () => {
    expect(normalizeOverviewRatingLabels("bandwidth", "微量,平稳")).toEqual([
      "微量",
      "平稳",
      "ACTIVE",
      "SURGE",
    ]);
    expect(normalizeOverviewRatingLabels("bandwidth", "微量,,高载,")).toEqual([
      "微量",
      "LIGHT",
      "高载",
      "SURGE",
    ]);
  });
});
