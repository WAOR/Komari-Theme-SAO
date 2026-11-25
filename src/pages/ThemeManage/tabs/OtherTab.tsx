import { LayoutTemplate, Compass, Sparkles, Bookmark } from "lucide-react";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { APPEARANCE_OPTIONS } from "../constants";
import { ToggleRow } from "../components/SettingControls";
import {
  SITE_BRAND_ICON_OPTIONS,
  DEFAULT_SITE_BRAND_ICON,
  persistSiteBrandIcon,
} from "@/components/brand-icons";
import { persistDarkBrandColor } from "@/utils/themeSettings";
import type { ThemeDraft } from "../types";

export function OtherTab({
  draft,
  patch,
  setAppearance,
}: {
  draft: ThemeDraft;
  patch: <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void;
  setAppearance: (value: "light" | "dark" | "system") => void;
}) {
  return (
    <>
      <InstancePanel
        kicker="外观"
        title="访客默认外观"
        aside={<LayoutTemplate size={16} />}
      >
        <div className="instance-segmented is-prominent is-even">
          {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              data-active={draft.defaultAppearance === value ? "true" : "false"}
              aria-pressed={draft.defaultAppearance === value}
              onClick={() => {
                patch("defaultAppearance", value);
                setAppearance(value);
              }}
              className="inline-flex items-center justify-center gap-2"
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </InstancePanel>

      <InstancePanel
        kicker="外观"
        title="站点品牌图标"
        aside={<Bookmark size={16} />}
      >
        <div className="flex flex-col gap-3" data-palette={draft.matrixColorTheme || "default"}>
          <p className="text-xs text-(--text-muted)">
            自定义左上角站点品牌标志，支持在浅色与深色模式下自适应呈现，并自动继承专属主题渐变色。
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {SITE_BRAND_ICON_OPTIONS.map((opt) => {
              const isSelected = (draft.siteBrandIcon ?? DEFAULT_SITE_BRAND_ICON) === opt.id;
              const IconComp = opt.component;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-active={isSelected ? "true" : "false"}
                  aria-pressed={isSelected}
                  onClick={() => {
                    patch("siteBrandIcon", opt.id);
                    persistSiteBrandIcon(opt.id);
                  }}
                  className="setting-brand-icon-card"
                  title={opt.desc}
                >
                  <div className="flex items-center justify-between w-full mb-2.5">
                    <div className="setting-brand-icon-preview">
                      <IconComp width={22} height={22} />
                    </div>
                    <div className="setting-color-theme-radio">
                      {isSelected && <span className="setting-color-theme-radio-dot" />}
                    </div>
                  </div>
                  <div className="text-left w-full min-w-0">
                    <span className="setting-brand-icon-name block truncate">{opt.name}</span>
                    <span className="setting-brand-icon-en block truncate">{opt.enName}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-(--border-subtle) pt-3 mt-1">
            <ToggleRow
              field="enableDarkBrandColor"
              title="深色模式彩色 LOGO 与站点名称"
              desc="开启后，顶栏左侧 LOGO 图标与站点名称将在深色模式下渲染为专属彩色渐变流光；此项设置仅在部分适配了彩色 LOGO 与站点名称的配色方案中生效。"
              checked={draft.enableDarkBrandColor}
              onPatch={(field, val) => {
                patch(field, val);
                persistDarkBrandColor(val);
              }}
            />
          </div>
        </div>
      </InstancePanel>

      <InstancePanel
        kicker="特效"
        title="季节限定"
        aside={<Sparkles size={16} />}
      >
        <div className="grid gap-3">
          <ToggleRow
            field="enableSeasonalSnow"
            title="季节限定（冬夜落雪 · 仅深色）"
            desc="开启后仅在深色模式首页背景飘落纯白点阵雪花动效，营造静谧冬夜浪漫氛围；浅色模式自动隐藏保持清爽通透。"
            checked={draft.enableSeasonalSnow}
            onPatch={patch}
          />
        </div>
      </InstancePanel>

      <InstancePanel
        kicker="权限"
        title="访客权限"
        aside={<Compass size={16} />}
      >
        <div className="flex flex-col gap-4">
          <div>
            <span className="setting-subhead-title block mb-2">卡片快捷按钮</span>
            <div className="grid gap-3 md:grid-cols-3">
              <ToggleRow
                field="showTrafficPageButton"
                title="流量入口"
                desc="在流量卡片右上角显示小图表按钮，点击直达统计页。"
                checked={draft.showTrafficPageButton}
                onPatch={patch}
              />
              <ToggleRow
                field="showCostSummary"
                title="资产入口"
                desc="在资产卡片右上角显示进入按钮；未公开时仅管理员可见。"
                checked={draft.showCostSummary}
                onPatch={patch}
              />
              <ToggleRow
                field="showCostSummaryFloatingButton"
                title="悬浮入口"
                desc="在右下角悬浮显示资产入口，未显示资产卡片时生效。"
                checked={draft.showCostSummaryFloatingButton}
                onPatch={patch}
              />
            </div>
          </div>

          <div className="border-t border-(--border-subtle) pt-3">
            <span className="setting-subhead-title block mb-2">访客查看权限（无需登录）</span>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleRow
                field="showTrafficPageForGuests"
                title="公开流量明细"
                desc="允许普通访客点击进入流量统计页面，查看各节点用量。"
                checked={draft.showTrafficPageForGuests}
                onPatch={patch}
              />
              <ToggleRow
                field="showPriceForGuests"
                title="公开资产价格"
                desc="允许普通访客查看机器价格与总花费；关闭则保密。"
                checked={draft.showPriceForGuests}
                onPatch={patch}
              />
            </div>
          </div>
        </div>
      </InstancePanel>
    </>
  );
}
