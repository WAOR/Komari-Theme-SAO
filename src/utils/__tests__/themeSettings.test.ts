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
    expect(normalizeThemeSettings({ matrixColorTheme: "invalid" as never }).matrixColorTheme).toBe("default");
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
});

