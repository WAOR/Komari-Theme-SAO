import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ThemeManage Topbar Anti-Regression Guard", () => {
  const filePath = path.resolve(__dirname, "../index.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  it("绝不包含已废弃的「改用后端配置」与「复制配置 JSON」按钮", () => {
    expect(content).not.toContain("改用后端配置");
    expect(content).not.toContain("复制配置 JSON");
    expect(content).not.toContain("handleCopySiteDefaults");
    expect(content).not.toContain("handleRestoreSiteDefaults");
    expect(content).not.toContain("siteDefaultsJson");
  });

  it("顶栏操作区 theme-manage-toolbar-actions 仅允许挂载 SiteSyncIndicator", () => {
    const toolbarMatch = content.match(/<div className="theme-manage-toolbar-actions">([\s\S]*?)<\/div>/);
    expect(toolbarMatch).not.toBeNull();
    const toolbarInner = toolbarMatch![1];
    expect(toolbarInner).toContain("<SiteSyncIndicator");
    expect(toolbarInner).not.toContain("<button");
  });

  it("绝不引入已废弃的顶栏旧图标组件", () => {
    expect(content).not.toMatch(/\bCloudDownload\b/);
    expect(content).not.toMatch(/\bClipboardCopy\b/);
    expect(content).not.toMatch(/\bClipboardCheck\b/);
  });
});

