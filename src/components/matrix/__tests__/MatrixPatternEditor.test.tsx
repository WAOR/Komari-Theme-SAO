import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MatrixPatternEditor } from "../MatrixPatternEditor";
import {
  PATTERN_PRESETS,
  DEFAULT_PATTERN_SET,
  getPatternPixelSet,
} from "@/utils/matrixPatterns";

describe("MatrixPatternEditor Component & Pattern Utilities", () => {
  it("renders 100 cells for 20x5 grid in static markup", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <MatrixPatternEditor value={null} onChange={onChange} />,
    );

    // 检查预设按钮
    expect(html).toContain("SAO");
    expect(html).toContain("EVA");
    expect(html).toContain("PING");
    expect(html).toContain("OPS");
    expect(html).toContain("FAST");
    expect(html).toContain("〰️ 心电脉冲");
    expect(html).toContain("🕹️ 吃豆人");
    expect(html).toContain("❤️ 爱心");
    expect(html).not.toContain("星星");
    expect(html).toContain("404");

    // 检查仅保留清空按钮，无重置按钮
    expect(html).toContain("清空");
    expect(html).not.toContain("重置");

    expect(html).toContain("mao-pattern-canvas");
    expect(html).toContain("已点亮 40 / 100 格");
  });

  it("renders empty canvas when value is an empty array", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <MatrixPatternEditor value={[]} onChange={onChange} />,
    );

    expect(html).toContain("已点亮 0 / 100 格");
  });

  it("renders with EVA palette styling when colorTheme is eva", () => {
    const onChange = vi.fn();
    const html = renderToStaticMarkup(
      <MatrixPatternEditor value={null} onChange={onChange} colorTheme="eva" />,
    );

    expect(html).toContain("mao-pattern-canvas is-eva");
  });

  it("resolves pattern pixel set correctly", () => {
    const defaultSet = getPatternPixelSet(null);
    expect(defaultSet.size).toBe(DEFAULT_PATTERN_SET.size);

    const custom = [0, 1, 2];
    const customSet = getPatternPixelSet(custom);
    expect(customSet.size).toBe(3);
    expect(customSet.has(0)).toBe(true);
    expect(customSet.has(1)).toBe(true);
    expect(customSet.has(2)).toBe(true);
    expect(customSet.has(3)).toBe(false);

    const evaSet = new Set(PATTERN_PRESETS.eva.indices);
    expect(evaSet.size).toBeGreaterThan(0);

    const emptySet = getPatternPixelSet([]);
    expect(emptySet.size).toBe(0);
  });

  it("renders user preset section, apply button and handles cloud presets", () => {
    const onApply = vi.fn();
    const presets = [
      { id: "p1", name: "机房A", indices: [0, 1, 2], createdAt: 1000 },
    ];
    const html = renderToStaticMarkup(
      <MatrixPatternEditor value={null} userPresets={presets} onApply={onApply} />,
    );

    expect(html).toContain("应用到首页");
    expect(html).toContain("用户预设:");
    expect(html).toContain("存为预设");
    expect(html).toContain("机房A");
  });
});
