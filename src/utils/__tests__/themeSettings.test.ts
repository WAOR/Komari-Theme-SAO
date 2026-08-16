import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_SETTINGS,
  normalizeThemeSettings,
} from "@/utils/themeSettings";
import { DEFAULT_BACKGROUND_VIDEO_URL } from "@/utils/background";

describe("normalizeThemeSettings", () => {
  it("defaults to image mode with the bundled desktop video ready to enable", () => {
    const settings = normalizeThemeSettings({});

    expect(settings.backgroundMediaType).toBe("image");
    expect(settings.backgroundVideo).toBe(DEFAULT_BACKGROUND_VIDEO_URL);
    expect(settings.backgroundVideoDark).toBe("");
    expect(settings.backgroundMediaType).toBe(DEFAULT_THEME_SETTINGS.backgroundMediaType);
    expect(settings.backgroundVideo).toBe(DEFAULT_THEME_SETTINGS.backgroundVideo);
    expect(normalizeThemeSettings({ backgroundVideo: "" }).backgroundVideo).toBe(
      DEFAULT_BACKGROUND_VIDEO_URL,
    );
  });

  it("normalizes the light and dark video fields independently", () => {
    const light = "https://cdn.example/day.mp4?Policy=a(b)&Signature=x%2By%3D";
    const dark = "/media/night%20sky.mp4?token=a%7Cb";
    const settings = normalizeThemeSettings({
      backgroundMediaType: "video",
      backgroundVideo: `  ${light}  `,
      backgroundVideoDark: `  ${dark}  `,
    });

    expect(settings.backgroundMediaType).toBe("video");
    expect(settings.backgroundVideo).toBe(light);
    expect(settings.backgroundVideoDark).toBe(dark);
  });

  it("does not migrate a pipe-delimited video value", () => {
    const settings = normalizeThemeSettings({
      backgroundVideo: "/light.mp4|/dark.mp4",
      backgroundVideoDark: "/night.mp4",
    });

    expect(settings.backgroundVideo).toBe(DEFAULT_BACKGROUND_VIDEO_URL);
    expect(settings.backgroundVideoDark).toBe("/night.mp4");
  });

  it("falls unknown media types back to image and rejects unsafe video URLs", () => {
    const settings = normalizeThemeSettings({
      backgroundMediaType: "animation",
      backgroundVideo: "javascript:alert(1)",
    } as never);

    expect(settings.backgroundMediaType).toBe("image");
    expect(settings.backgroundVideo).toBe(DEFAULT_BACKGROUND_VIDEO_URL);
    expect(settings.backgroundVideoDark).toBe("");
  });

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

  it("defaults overview ratings on unless explicitly disabled", () => {
    expect(normalizeThemeSettings({}).showOverviewRatings).toBe(true);
    expect(normalizeThemeSettings({ showOverviewRatings: false }).showOverviewRatings).toBe(false);
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
    expect(resolved.homepageMultiPingTaskIds).toEqual([3, 1, 2]);
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

  it("parses hiddenNodes from a delimited string and dedupes", () => {
    expect(normalizeThemeSettings({}).hiddenNodes).toEqual([]);
    expect(
      normalizeThemeSettings({ hiddenNodes: "节点A, 节点A\nuuid-1；节点B" } as never).hiddenNodes,
    ).toEqual(["节点A", "uuid-1", "节点B"]);
  });
});
