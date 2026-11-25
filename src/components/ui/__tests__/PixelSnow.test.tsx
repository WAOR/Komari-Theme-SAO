import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PixelSnow } from "../PixelSnow";
import { OtherTab } from "@/pages/ThemeManage/tabs/OtherTab";
import type { ThemeDraft } from "@/pages/ThemeManage/types";
import { normalizeThemeSettings } from "@/utils/themeSettings";
import { pickManagedThemeSettings } from "@/pages/ThemeManage/utils";

describe("PixelSnow component", () => {
  it("renders the canvas and container structure", () => {
    const html = renderToStaticMarkup(
      <PixelSnow className="custom-snow" data-testid="snow-box" />,
    );
    expect(html).toContain("pixel-snow-container");
    expect(html).toContain("custom-snow");
    expect(html).toContain("<canvas");
    expect(html).toContain("pixel-snow-canvas");
    expect(html).toContain('aria-hidden="true"');
  });

  it("normalizes enableSeasonalSnow in themeSettings correctly", () => {
    // 默认关闭
    expect(normalizeThemeSettings({}).enableSeasonalSnow).toBe(false);
    // 显式开启
    expect(normalizeThemeSettings({ enableSeasonalSnow: true }).enableSeasonalSnow).toBe(true);
    // 无效值回退
    expect(normalizeThemeSettings({ enableSeasonalSnow: "yes" as never }).enableSeasonalSnow).toBe(false);

    // pickManagedThemeSettings 包含 enableSeasonalSnow
    const managed = pickManagedThemeSettings(normalizeThemeSettings({ enableSeasonalSnow: true }));
    expect(managed.enableSeasonalSnow).toBe(true);
  });

  it("renders the seasonal snow toggle switch in OtherTab", () => {
    const mockDraft = {
      defaultAppearance: "system",
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

    expect(html).toContain("季节限定");
    expect(html).toContain("季节限定（冬夜落雪 · 仅深色）");
  });
});
