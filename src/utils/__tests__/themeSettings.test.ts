import { describe, expect, it } from "vitest";
import { normalizeThemeSettings } from "@/utils/themeSettings";

describe("normalizeThemeSettings", () => {
  it("keeps mini and falls unknown saved view modes back to compact", () => {
    const settings = normalizeThemeSettings({
      desktopNodeViewMode: "retired-view",
      mobileNodeViewMode: "retired-view",
    } as never);

    expect(settings.desktopNodeViewMode).toBe("compact");
    expect(settings.mobileNodeViewMode).toBe("compact");
    expect(normalizeThemeSettings({ desktopNodeViewMode: "mini" }).desktopNodeViewMode).toBe(
      "mini",
    );
    expect(normalizeThemeSettings({ mobileNodeViewMode: "mini" }).mobileNodeViewMode).toBe("mini");
    expect(normalizeThemeSettings({ mobileNodeViewMode: "list" }).mobileNodeViewMode).toBe(
      "compact",
    );
  });

  it("defaults overview ratings on unless explicitly disabled, while traffic and asset ratings default to false", () => {
    const defaults = normalizeThemeSettings({});
    expect(defaults.showOverviewRatings).toBe(true);
    expect(defaults.showBandwidthRating).toBe(true);
    expect(defaults.showTrafficRating).toBe(false);
    expect(defaults.showAssetRating).toBe(false);

    expect(normalizeThemeSettings({ showOverviewRatings: false }).showOverviewRatings).toBe(false);
    expect(normalizeThemeSettings({ showTrafficRating: true }).showTrafficRating).toBe(true);
    expect(normalizeThemeSettings({ showAssetRating: true }).showAssetRating).toBe(true);
    expect(normalizeThemeSettings({ showBandwidthRating: false }).showBandwidthRating).toBe(false);
  });

  it("normalizes homepage multi-ping tasks while preserving an enabled draft for repair", () => {
    expect(normalizeThemeSettings({}).enableHomepageMultiPing).toBe(false);
    expect(
      normalizeThemeSettings({
        enableHomepageMultiPing: true,
        homepageMultiPingTaskIds: [3, 1],
      }).enableHomepageMultiPing,
    ).toBe(true);

    const resolved = normalizeThemeSettings({
      enableHomepageMultiPing: true,
      homepageMultiPingTaskIds: [3, 1, 3, 2, 4],
    });
    expect(resolved.enableHomepageMultiPing).toBe(true);
    expect(resolved.homepageMultiPingTaskIds).toEqual([3, 1, 2, 4]);
  });

  it("defaults home sort to weight ascending and falls back to a field's natural direction", () => {
    const base = normalizeThemeSettings({});
    expect(base.enableHomeSort).toBe(true);
    expect(base.homeSortField).toBe("default");
    expect(base.homeSortDirection).toBe("asc");

    // 指定字段但缺省方向 → 回落该字段自然方向(网速为降序)。
    expect(normalizeThemeSettings({ homeSortField: "speed" } as never).homeSortDirection).toBe("desc");
    // 非法字段回落 default。
    expect(normalizeThemeSettings({ homeSortField: "nope" } as never).homeSortField).toBe("default");
  });

  it("keeps fake ping off unless explicitly enabled", () => {
    expect(normalizeThemeSettings({}).fakePingForUnbound).toBe(false);
    expect(normalizeThemeSettings({ fakePingForUnbound: true }).fakePingForUnbound).toBe(true);
    // 非布尔真值不算显式开启。
    expect(
      normalizeThemeSettings({ fakePingForUnbound: "yes" } as never).fakePingForUnbound,
    ).toBe(false);
  });

  it("defaults showPriceForGuests to false unless explicitly enabled", () => {
    expect(normalizeThemeSettings({}).showPriceForGuests).toBe(false);
    expect(normalizeThemeSettings({ showPriceForGuests: true }).showPriceForGuests).toBe(true);
    expect(normalizeThemeSettings({ showPriceForGuests: false }).showPriceForGuests).toBe(false);
    expect(normalizeThemeSettings({ showPriceForGuests: "yes" } as never).showPriceForGuests).toBe(false);
  });

  it("defaults showTrafficPageForGuests to false unless explicitly enabled", () => {
    expect(normalizeThemeSettings({}).showTrafficPageForGuests).toBe(false);
    expect(normalizeThemeSettings({ showTrafficPageForGuests: true }).showTrafficPageForGuests).toBe(true);
    expect(normalizeThemeSettings({ showTrafficPageForGuests: false }).showTrafficPageForGuests).toBe(false);
    expect(normalizeThemeSettings({ showTrafficPageForGuests: "yes" } as never).showTrafficPageForGuests).toBe(false);
  });

  it("parses hiddenNodes from a delimited string and dedupes", () => {
    expect(normalizeThemeSettings({}).hiddenNodes).toEqual([]);
    expect(
      normalizeThemeSettings({ hiddenNodes: "节点A, 节点A\nuuid-1；节点B" } as never).hiddenNodes,
    ).toEqual(["节点A", "uuid-1", "节点B"]);
  });

  it("normalizes clusterOverviewMode correctly across all valid options", () => {
    expect(normalizeThemeSettings({ clusterOverviewMode: "classic" }).clusterOverviewMode).toBe("classic");
    expect(normalizeThemeSettings({ clusterOverviewMode: "nodes" }).clusterOverviewMode).toBe("nodes");
    expect(normalizeThemeSettings({ clusterOverviewMode: "traffic" as never }).clusterOverviewMode).toBe("classic");
    expect(normalizeThemeSettings({ clusterOverviewMode: "carousel" as never }).clusterOverviewMode).toBe("nodes");
    expect(normalizeThemeSettings({ clusterOverviewMode: "invalid" as never }).clusterOverviewMode).toBe("classic");
  });

  it("normalizes matrixColorTheme correctly", () => {
    expect(normalizeThemeSettings({ matrixColorTheme: "default" }).matrixColorTheme).toBe("default");
    expect(normalizeThemeSettings({ matrixColorTheme: "eva" }).matrixColorTheme).toBe("eva");
    expect(normalizeThemeSettings({ matrixColorTheme: "divergence" }).matrixColorTheme).toBe("divergence");
    expect(normalizeThemeSettings({ matrixColorTheme: "cyberpunk" as never }).matrixColorTheme).toBe("eva");
    expect(normalizeThemeSettings({ matrixColorTheme: "matrix-code" as never }).matrixColorTheme).toBe("eva");
    expect(normalizeThemeSettings({ matrixColorTheme: "dual-blades" as never }).matrixColorTheme).toBe("eva");
    expect(normalizeThemeSettings({ matrixColorTheme: "red-comet" as never }).matrixColorTheme).toBe("eva");
    expect(normalizeThemeSettings({ matrixColorTheme: "invalid" as never }).matrixColorTheme).toBe("eva");
  });

  it("normalizes matrixMockFill correctly", () => {
    expect(normalizeThemeSettings({ matrixMockFill: true }).matrixMockFill).toBe(true);
    expect(normalizeThemeSettings({ matrixMockFill: false }).matrixMockFill).toBe(false);
    expect(normalizeThemeSettings({ matrixMockFill: "yes" as never }).matrixMockFill).toBe(false);
    expect(normalizeThemeSettings({}).matrixMockFill).toBe(false);
  });

  it("normalizes matrixBootAnimation correctly", () => {
    expect(normalizeThemeSettings({ matrixBootAnimation: true }).matrixBootAnimation).toBe(true);
    expect(normalizeThemeSettings({ matrixBootAnimation: false }).matrixBootAnimation).toBe(false);
    expect(normalizeThemeSettings({}).matrixBootAnimation).toBe(true);
  });

  it("normalizes matrixBootEffect correctly", () => {
    expect(normalizeThemeSettings({ matrixBootEffect: "laser-scan" }).matrixBootEffect).toBe("laser-scan");
    expect(normalizeThemeSettings({ matrixBootEffect: "digital-rain" }).matrixBootEffect).toBe("digital-rain");
    expect(normalizeThemeSettings({ matrixBootEffect: "cyber-glitch" }).matrixBootEffect).toBe("cyber-glitch");
    expect(normalizeThemeSettings({ matrixBootEffect: "divergence-flux" }).matrixBootEffect).toBe("divergence-flux");
    expect(normalizeThemeSettings({ matrixBootEffect: "invalid" as never }).matrixBootEffect).toBe("laser-scan");
    expect(normalizeThemeSettings({}).matrixBootEffect).toBe("laser-scan");
  });

  it("normalizes matrixCustomPattern correctly", () => {
    expect(normalizeThemeSettings({ matrixCustomPattern: [1, 2, 3] }).matrixCustomPattern).toEqual([1, 2, 3]);
    expect(normalizeThemeSettings({ matrixCustomPattern: [99, 0, 50] }).matrixCustomPattern).toEqual([0, 50, 99]);
    expect(normalizeThemeSettings({ matrixCustomPattern: [] }).matrixCustomPattern).toEqual([]);
    expect(normalizeThemeSettings({ matrixCustomPattern: [-1, 100, 200] }).matrixCustomPattern).toEqual([]);
    expect(normalizeThemeSettings({ matrixCustomPattern: "invalid" as never }).matrixCustomPattern).toBeNull();
    expect(normalizeThemeSettings({}).matrixCustomPattern).toBeNull();
  });

  it("normalizes matrixUserPresets correctly", () => {
    const raw = [
      { id: "1", name: "  设计A  ", indices: [5, 2, 2, 99, 105, -1], createdAt: 12345 },
      { id: "2", invalid: true },
    ];
    const normalized = normalizeThemeSettings({ matrixUserPresets: raw as never }).matrixUserPresets;
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toEqual({
      id: "1",
      name: "设计A",
      indices: [2, 5, 99],
      createdAt: 12345,
    });
  });

  it("normalizes ping latency thresholds and colors correctly", () => {
    const custom = normalizeThemeSettings({
      pingLatencyThresholds: {
        excellent: 50,
        good: 90,
        moderate: 140,
        elevated: 180,
      },
      pingLatencyColors: {
        excellent: "#00ff00",
        good: "#ffff00",
        moderate: "#ffaa00",
        elevated: "#ff5500",
        critical: "#ff0000",
      },
    });
    expect(custom.pingLatencyThresholds).toEqual({
      excellent: 50,
      good: 90,
      moderate: 140,
      elevated: 180,
    });
    expect(custom.pingLatencyColors).toEqual({
      excellent: "#00ff00",
      good: "#ffff00",
      moderate: "#ffaa00",
      elevated: "#ff5500",
      critical: "#ff0000",
    });

    const fallback = normalizeThemeSettings({
      pingLatencyThresholds: {
        excellent: -10,
        good: 20, // should be > excellent
        moderate: "invalid" as never,
        elevated: 10,
      },
      pingLatencyColors: {
        excellent: "not-a-color",
      },
    });
    expect(fallback.pingLatencyThresholds.excellent).toBe(60);
    expect(fallback.pingLatencyColors.excellent).toBe("#10b981");
  });

  it("normalizes ping loss thresholds and colors correctly", () => {
    const custom = normalizeThemeSettings({
      pingLossThresholds: {
        low: 5,
        medium: 15,
      },
      pingLossColors: {
        zero: "#00ff00",
        low: "#ffff00",
        medium: "#ff8800",
        high: "#ff0000",
      },
    });
    expect(custom.pingLossThresholds).toEqual({ low: 5, medium: 15 });
    expect(custom.pingLossColors).toEqual({
      zero: "#00ff00",
      low: "#ffff00",
      medium: "#ff8800",
      high: "#ff0000",
    });

    const fallback = normalizeThemeSettings({
      pingLossThresholds: {
        low: -5,
        medium: 200,
      },
      pingLossColors: {
        zero: "invalid",
      },
    });
    expect(fallback.pingLossThresholds.low).toBe(3);
    expect(fallback.pingLossColors.zero).toBe("#10b981");
  });

  it("normalizes traffic spectrum colors correctly with presets and fallbacks", () => {
    const custom = normalizeThemeSettings({
      trafficSpectrumColors: {
        start: "#00F0FF",
        mid: "#E0F542",
        high: "#FF7700",
        end: "#EF4444",
      },
    });
    expect(custom.trafficSpectrumColors).toEqual({
      start: "#00f0ff",
      mid: "#e0f542",
      high: "#ff7700",
      end: "#ef4444",
    });

    const fallback = normalizeThemeSettings({
      trafficSpectrumColors: {
        start: "not-a-color",
        mid: "123",
      },
    });
    expect(fallback.trafficSpectrumColors).toEqual({
      start: "#10b981",
      mid: "#eab308",
      high: "#f97316",
      end: "#ef4444",
    });
  });

  it("normalizes overviewCards with exact 6 slots, fallback fill, and deduplication", () => {
    const defaults = normalizeThemeSettings({});
    expect(defaults.overviewCards).toEqual([
      "connections",
      "cpu",
      "ram",
      "disk",
      "traffic",
      "asset",
    ]);
    expect(defaults.overviewCards.length).toBe(6);

    // 用户自定义传入部分槽位：过滤非法项，自动补齐至 6 个不同的卡片
    const custom = normalizeThemeSettings({
      overviewCards: ["nodes", "cpu", "bandwidth", "invalid_id" as never],
    });
    expect(custom.overviewCards.slice(0, 3)).toEqual(["nodes", "cpu", "bandwidth"]);
    expect(custom.overviewCards.length).toBe(6);
    expect(custom.overviewCards).not.toContain("invalid_id");
    // 确保 6 个元素互不重复
    expect(new Set(custom.overviewCards).size).toBe(6);

    // 传入超过 6 个时严格截断为 6 个
    const overflow = normalizeThemeSettings({
      overviewCards: [
        "nodes",
        "cpu",
        "bandwidth",
        "swap",
        "process",
        "cores",
        "disk",
        "traffic",
      ],
    });
    expect(overflow.overviewCards.length).toBe(6);
    expect(overflow.overviewCards).toEqual([
      "nodes",
      "cpu",
      "bandwidth",
      "swap",
      "process",
      "cores",
    ]);
  });
});

