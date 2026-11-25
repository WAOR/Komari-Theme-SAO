import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BrandIcon,
  SITE_BRAND_ICON_OPTIONS,
  DEFAULT_SITE_BRAND_ICON,
  isSiteBrandIconId,
} from "../index";
import {
  normalizeThemeSettings,
  readStoredPalette,
  persistPalette,
  isMatrixColorTheme,
} from "@/utils/themeSettings";
import { pickManagedThemeSettings } from "@/pages/ThemeManage/utils";
import { OtherTab } from "@/pages/ThemeManage/tabs/OtherTab";
import type { ThemeDraft } from "@/pages/ThemeManage/types";

describe("BrandIcon and SiteBrandIcon registry", () => {
  it("has exactly 10 supported brand icons", () => {
    expect(SITE_BRAND_ICON_OPTIONS.length).toBe(10);
  });

  it("identifies valid icon IDs correctly", () => {
    expect(isSiteBrandIconId("sao-radar")).toBe(true);
    expect(isSiteBrandIconId("heartbeat")).toBe(true);
    expect(isSiteBrandIconId("skull")).toBe(true);
    expect(isSiteBrandIconId("broadcast")).toBe(true);
    expect(isSiteBrandIconId("clover")).toBe(true);
    expect(isSiteBrandIconId("ghost-3")).toBe(true);
    expect(isSiteBrandIconId("brand-google-podcasts")).toBe(true);
    expect(isSiteBrandIconId("diaper")).toBe(true);
    expect(isSiteBrandIconId("brand-soundcloud")).toBe(true);
    expect(isSiteBrandIconId("hand-little-finger")).toBe(true);
    expect(isSiteBrandIconId("invalid-icon")).toBe(false);
  });

  it("normalizes siteBrandIcon in themeSettings correctly", () => {
    expect(normalizeThemeSettings({}).siteBrandIcon).toBe(DEFAULT_SITE_BRAND_ICON);
    expect(normalizeThemeSettings({ siteBrandIcon: "heartbeat" }).siteBrandIcon).toBe("heartbeat");
    expect(normalizeThemeSettings({ siteBrandIcon: "invalid" as never }).siteBrandIcon).toBe(DEFAULT_SITE_BRAND_ICON);
  });

  it("includes siteBrandIcon in managed theme settings draft", () => {
    const resolved = normalizeThemeSettings({ siteBrandIcon: "broadcast" });
    const managed = pickManagedThemeSettings(resolved);
    expect(managed.siteBrandIcon).toBe("broadcast");
  });

  it("renders BrandIcon with gradient defs", () => {
    const html = renderToStaticMarkup(<BrandIcon id="clover" />);
    expect(html).toContain("<svg");
    expect(html).toContain('id="mao-nav-aurora-gradient-dark"');
    expect(html).toContain('id="mao-nav-divergence-gradient-dark"');
  });

  it("renders site brand icon picker in OtherTab", () => {
    const mockDraft = {
      defaultAppearance: "system",
      siteBrandIcon: "heartbeat",
      enableSeasonalSnow: true,
      showTrafficPageButton: true,
      showCostSummary: true,
      showCostSummaryFloatingButton: true,
      showTrafficPageForGuests: false,
      showPriceForGuests: false,
    } as unknown as ThemeDraft;

    const html = renderToStaticMarkup(
      <OtherTab
        draft={mockDraft}
        patch={() => {}}
        setAppearance={() => {}}
      />,
    );
    expect(html).toContain("站点品牌图标");
    expect(html).toContain("SAO 雷达");
    expect(html).toContain("心跳脉冲");
    expect(html).toContain("幸运四叶草");
    expect(html).toContain("调皮幽灵");
    expect(html).toContain("拉勾之誓");
  });

  it("persists and reads palette correctly", () => {
    persistPalette("aurora");
    expect(readStoredPalette()).toBe("aurora");
    expect(isMatrixColorTheme("aurora")).toBe(true);
    expect(isMatrixColorTheme("invalid")).toBe(false);
  });
});
