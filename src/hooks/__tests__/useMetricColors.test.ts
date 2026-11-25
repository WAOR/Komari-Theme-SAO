import { describe, expect, it } from "vitest";
import {
  DEFAULT_DARK_DEPTH,
  getPresetMetricColors,
  normalizeDarkDepth,
  readDarkDepthFromSettings,
  readMetricColorsFromSettings,
} from "@/hooks/useMetricColors";

describe("dark depth settings", () => {
  it("keeps the existing gray-black palette as the default", () => {
    expect(readDarkDepthFromSettings(undefined)).toBe(DEFAULT_DARK_DEPTH);
    expect(readDarkDepthFromSettings({})).toBe(0);
  });

  it("rounds and clamps the persisted depth to the safe 0-100 range", () => {
    expect(normalizeDarkDepth(42.6)).toBe(43);
    expect(normalizeDarkDepth(-20)).toBe(0);
    expect(normalizeDarkDepth(180)).toBe(100);
  });

  it("falls back for invalid values and accepts a numeric stored string", () => {
    expect(readDarkDepthFromSettings({ darkDepth: "75" })).toBe(75);
    expect(readDarkDepthFromSettings({ darkDepth: "black" })).toBe(0);
  });
});

describe("metric colors preset fallback", () => {
  it("returns aurora preset (#82dd2d) by default", () => {
    const fallback = getPresetMetricColors(undefined);
    expect(fallback.cpu).toBe("#82dd2d");
    expect(fallback.memory).toBe("#82dd2d");
  });

  it("returns divergence preset (#ff7700) when divergence", () => {
    const fallback = getPresetMetricColors("divergence");
    expect(fallback.cpu).toBe("#ff7700");
    expect(fallback.memory).toBe("#ff7700");
  });

  it("reads explicitly stored colors from settings", () => {
    const colors = readMetricColorsFromSettings({
      metricColors: { cpu: "#ff0000" },
    });
    expect(colors.cpu).toBe("#ff0000");
    expect(colors.memory).toBeUndefined();
  });
});
