import { Layers, Palette, Activity, Sparkles, RotateCcw, LayoutGrid } from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { MatrixPatternEditor } from "@/components/matrix/MatrixPatternEditor";
import { ToggleRow } from "../components/SettingControls";
import { BandwidthTierCard } from "../components/BandwidthTierCard";
import { OverviewCardPool } from "../components/OverviewCardPool";
import { COLOR_THEME_OPTIONS, BOOT_EFFECT_OPTIONS, BANDWIDTH_TIERS } from "../constants";
import { persistPalette, STATUS_BAR_PRESETS, type StatusBarPreset } from "@/utils/themeSettings";
import type { ThemeDraft } from "../types";
import type { OverviewData } from "@/components/node/OverviewStatCard";
import type { HourlyTrafficBucket } from "@/utils/trafficStats";
import type { NodeInfo } from "@/types/komari";
import type { calculateCostSummary } from "@/utils/cost";

export function OverviewTab({
  draft,
  patch,
  handleSave,
  showToast,
  setRatingLabelDraft,
  realOverview,
  realCostSummary,
  todayTrafficTotal,
  todayTrafficHourly,
  todayTrafficPending,
  allNodes = [],
  exchangeRates,
  applyStatusBarPreset,
}: {
  draft: ThemeDraft;
  patch: <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void;
  handleSave: (draftOverride?: ThemeDraft) => Promise<void>;
  showToast: (msg: string) => void;
  setRatingLabelDraft: (kind: "bandwidth", value: string) => void;
  realOverview: OverviewData | undefined;
  realCostSummary: ReturnType<typeof calculateCostSummary> | null;
  todayTrafficTotal: number | null;
  todayTrafficHourly: HourlyTrafficBucket[] | null;
  todayTrafficPending: boolean;
  allNodes?: NodeInfo[];
  exchangeRates?: Record<string, number>;
  applyStatusBarPreset?: (preset: StatusBarPreset) => void;
}) {
  const currentPaletteOpt =
    COLOR_THEME_OPTIONS.find(
      (opt) => opt.id === (draft.matrixColorTheme ?? "aurora"),
    ) ?? COLOR_THEME_OPTIONS[0];

  const currentBootEffect =
    BOOT_EFFECT_OPTIONS.find(
      (e) => e.id === (draft.matrixBootEffect ?? "laser-scan"),
    ) ?? BOOT_EFFECT_OPTIONS[0];

  return (
    <div className="flex flex-col gap-6">
      {/* 面板 1: 监控总览 */}
      <InstancePanel
        kicker="总览"
        title="监控总览"
        description="控制首页顶部核心指标与集群大盘模块的全局启用状态。"
        aside={<Layers size={16} />}
      >
        <ToggleRow
          field="showHomeOverview"
          title="启用首页总览"
          desc="在首页顶部展示核心指标卡片与集群状态大盘。"
          checked={draft.showHomeOverview}
          onPatch={patch}
        />
      </InstancePanel>

      {(draft.showHomeOverview ?? true) && (
        <>
          {/* 面板 2: 配色方案 */}
          <InstancePanel
            kicker="配色"
            title="配色方案"
            description="一键更换整站配色主题，实时应用到顶部指标卡、曲线图与机架方格大盘。"
            aside={<Palette size={16} />}
            titleAction={
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${currentPaletteOpt.badgeClass}`}
              >
                {currentPaletteOpt.badge}
              </span>
            }
          >
            <div
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5"
              data-palette={draft.matrixColorTheme || "aurora"}
            >
              {COLOR_THEME_OPTIONS.map((opt) => {
                const isSelected = (draft.matrixColorTheme ?? "aurora") === opt.id;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      patch("matrixColorTheme", opt.id);
                      persistPalette(opt.id);
                      if (typeof document !== "undefined") {
                        document.documentElement.dataset.palette = opt.id;
                      }
                      if (applyStatusBarPreset) {
                        const matchedPreset = STATUS_BAR_PRESETS.find(
                          (p) => p.id === opt.id || (opt.id === "default" && p.id === "classic"),
                        );
                        if (matchedPreset) applyStatusBarPreset(matchedPreset);
                      }
                    }}
                    data-active={isSelected ? "true" : "false"}
                    aria-pressed={isSelected}
                    className={`setting-color-theme-card is-${opt.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-1 shrink-0 p-1 rounded-md bg-(--bg-card) border border-(--hairline)">
                        {opt.colors.map((c, i) => (
                          <span
                            key={i}
                            className="w-2.5 h-2.5 rounded-xs"
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-(--text-primary) block truncate">
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-(--text-muted) block truncate">
                          {opt.desc}
                        </span>
                      </div>
                    </div>
                    <div className="setting-color-theme-radio" aria-hidden="true">
                      {isSelected && <div className="setting-color-theme-radio-dot" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </InstancePanel>

          {/* 面板 3: 指标卡池 */}
          <OverviewCardPool
            draft={draft}
            patch={patch}
            realOverview={realOverview}
            realCostSummary={realCostSummary}
            todayTrafficTotal={todayTrafficTotal}
            todayTrafficHourly={todayTrafficHourly}
            todayTrafficPending={todayTrafficPending}
            allNodes={allNodes}
            exchangeRates={exchangeRates}
            handleSave={handleSave}
          />

          {/* 面板 4: 集群状态大盘 */}
          <InstancePanel
            id="set-cluster-overview-mode"
            kicker="大盘"
            title="集群状态大盘"
            description="设置首页右侧核心区域的展现形态，以及是否允许 3D 双面翻转。"
            aside={<Activity size={16} />}
            titleAction={
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                {draft.clusterOverviewMode === "nodes" ? "SAO 方格矩阵" : "SAO 趋势大盘"}
              </span>
            }
          >
            <div className="flex flex-col gap-4">
              {/* 默认展示形态选择 */}
              <div className="setting-mode-cards">
                {[
                  {
                    value: "classic" as const,
                    label: "SAO 趋势大盘",
                    desc: "用平滑曲线实时展现整体在线率与上下行网络流速。",
                    icon: Layers,
                  },
                  {
                    value: "nodes" as const,
                    label: "SAO 方格矩阵",
                    desc: "每台机器显示为一个方块，一眼看清哪台负载高或掉线。",
                    icon: LayoutGrid,
                  },
                ].map(({ value, label, desc, icon: ModeIcon }) => {
                  const isActive = (draft.clusterOverviewMode ?? "nodes") === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => patch("clusterOverviewMode", value)}
                      data-active={isActive ? "true" : "false"}
                      aria-pressed={isActive}
                      className="setting-mode-card"
                    >
                      <div className="setting-mode-card-head">
                        <div className="setting-mode-card-title">
                          <ModeIcon size={15} />
                          <span>{label}</span>
                        </div>
                        <div className="setting-mode-card-radio" aria-hidden="true">
                          <div className="setting-mode-card-radio-dot" />
                        </div>
                      </div>
                      <div className="setting-mode-card-desc">{desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* 3D 双面翻转交互开关卡片框 */}
              <div className="rounded-xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                      <span>3D 双面翻转交互</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                        3D FLIP
                      </span>
                    </div>
                    <p className="text-[11px] text-(--text-muted) mt-0.5">
                      访客点击卡片可在「趋势大盘」与「方格矩阵」间无缝翻面查看；关闭则仅固定展示上方所选模式。
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.enableClusterFlip ?? true}
                    onChange={(event) => patch("enableClusterFlip", event.target.checked)}
                    className="h-4 w-4 shrink-0 accent-(--accent-500)"
                  />
                </label>
              </div>
            </div>
          </InstancePanel>

          {/* 面板 5: 方格矩阵定制 */}
          <InstancePanel
            kicker="矩阵"
            title="方格矩阵定制"
            description="定制机架全景矩阵的开屏动效、像素点阵图案与模拟插槽填充。"
            aside={<LayoutGrid size={16} />}
          >
            <div className="flex flex-col gap-4">
              {/* 子区块 1: 开屏动效与点阵图案卡片框 */}
              <div className="rounded-xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                      <span>开屏动画</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                        BOOT INTRO
                      </span>
                    </div>
                    <p className="text-[11px] text-(--text-muted) mt-0.5">
                      首次打开首页时播放入场动效，随后载入监控数据。
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.matrixBootAnimation ?? true}
                    onChange={(event) => patch("matrixBootAnimation", event.target.checked)}
                    className="h-4 w-4 shrink-0 accent-(--accent-500)"
                  />
                </label>

                {(draft.matrixBootAnimation ?? true) && (
                  <div className="mt-4 pt-4 border-t border-(--hairline) space-y-4">
                    {/* 动效形式选择 */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div>
                          <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                            <span>动效样式</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${currentBootEffect.badgeClass}`}
                            >
                              {currentBootEffect.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-(--text-muted) mt-0.5">
                            选择开屏画面的入场动效样式。
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {BOOT_EFFECT_OPTIONS.map((opt) => {
                          const isSelected = (draft.matrixBootEffect ?? "laser-scan") === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => patch("matrixBootEffect", opt.id)}
                              data-active={isSelected ? "true" : "false"}
                              aria-pressed={isSelected}
                              className="setting-color-theme-card"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-(--text-primary) truncate">
                                      {opt.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-(--text-muted) block truncate mt-0.5">
                                    {opt.desc}
                                  </span>
                                </div>
                              </div>
                              <div className="setting-color-theme-radio" aria-hidden="true">
                                {isSelected && (
                                  <div className="setting-color-theme-radio-dot" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 点阵画板 */}
                    <MatrixPatternEditor
                      value={draft.matrixCustomPattern}
                      userPresets={draft.matrixUserPresets}
                      colorTheme={draft.matrixColorTheme ?? "aurora"}
                      bootEffect={draft.matrixBootEffect ?? "laser-scan"}
                      onApply={async (pattern) => {
                        patch("matrixCustomPattern", pattern);
                        try {
                          await handleSave({ ...draft, matrixCustomPattern: pattern });
                          showToast("已将点阵图案应用到首页并保存生效");
                        } catch {
                          showToast("已应用到画板，请点击右上角保存");
                        }
                      }}
                      onSaveUserPresets={async (presets) => {
                        patch("matrixUserPresets", presets);
                        try {
                          await handleSave({ ...draft, matrixUserPresets: presets });
                          showToast("用户预设已更新并保存生效");
                        } catch {
                          showToast("预设已更新，请点击右上角保存");
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 子区块 2: 模拟数据填充空闲机位插槽卡片框 (告别单纯分割线) */}
              <div className="rounded-xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                      <span>模拟数据填充空闲机位插槽</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                        MOCK FILL
                      </span>
                    </div>
                    <p className="text-[11px] text-(--text-muted) mt-0.5">
                      开启后，机架方格矩阵中未接入服务器的闲置插槽将使用模拟数据填满，并在运行期间周期性随机变幻「空闲待机」、「活跃传输」与「高吞吐」状态及吞吐速率，令机架方格更显生机灵动。
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.matrixMockFill ?? true}
                    onChange={(event) => patch("matrixMockFill", event.target.checked)}
                    className="h-4 w-4 shrink-0 accent-(--accent-500)"
                  />
                </label>
              </div>
            </div>
          </InstancePanel>

          {/* 面板 6: 带宽评级徽章 */}
          <InstancePanel
            id="set-bandwidth-rating"
            kicker="评级"
            title="带宽评级徽章"
            description="在集群大盘顶部实时反馈全站网络吞吐负荷级别，支持自定义各级别分级词与状态徽章。"
            aside={<Sparkles size={16} />}
            titleAction={
              <span
                className={clsx(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline)",
                  draft.showBandwidthRating
                    ? "bg-(--bg-card) text-(--accent-500)"
                    : "bg-(--bg-card) text-(--text-muted)",
                )}
              >
                {draft.showBandwidthRating ? "已开启" : "已停用"}
              </span>
            }
          >
            <div className="flex flex-col gap-4">
              <ToggleRow
                field="showBandwidthRating"
                title="开启集群带宽状态徽章"
                desc="在集群状态模块顶部实时反馈全站网络吞吐负荷级别。"
                checked={draft.showBandwidthRating}
                onPatch={patch}
              />

              <div
                className={clsx(
                  "pt-4 border-t border-(--hairline) transition-opacity",
                  !draft.showBandwidthRating && "opacity-60",
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3">
                  <div>
                    <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                      <Sparkles size={13} className="text-(--accent-500)" />
                      <span>自定义带宽评级文案</span>
                    </div>
                    <p className="text-[11px] text-(--text-muted) mt-0.5">
                      可直接在对应徽章内修改分级词，支持中英文，修改即刻生效。
                    </p>
                  </div>
                  {Boolean(draft.ratingLabels.bandwidth) && (
                    <button
                      type="button"
                      disabled={!draft.showBandwidthRating}
                      onClick={() => setRatingLabelDraft("bandwidth", "")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-(--accent-500) hover:text-(--accent-400) border border-(--hairline) rounded-md bg-(--bg-card) hover:bg-(--surface-hover) transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>全部恢复默认</span>
                    </button>
                  )}
                </div>

                <div
                  className="mao-progress-container p-0! border-none! bg-transparent! shadow-none! backdrop-filter-none! gap-0! h-auto!"
                  data-palette={draft.matrixColorTheme || "aurora"}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {(() => {
                      const rawString = draft.ratingLabels.bandwidth ?? "";
                      const rawParts = rawString ? rawString.split(",").map((s) => s.trim()) : [];

                      const handleCommitTier = (level: number, val: string) => {
                        const currentList = BANDWIDTH_TIERS.map((t, idx) => rawParts[idx] ?? t.defaultLabel);
                        currentList[level] = val.trim();

                        const allDefault = currentList.every(
                          (item, idx) => !item || item === BANDWIDTH_TIERS[idx].defaultLabel,
                        );
                        if (allDefault) {
                          setRatingLabelDraft("bandwidth", "");
                        } else {
                          const filled = currentList.map(
                            (item, idx) => item || BANDWIDTH_TIERS[idx].defaultLabel,
                          );
                          setRatingLabelDraft("bandwidth", filled.join(","));
                        }
                      };

                      const handleResetTier = (level: number) => {
                        const currentList = BANDWIDTH_TIERS.map((t, idx) => rawParts[idx] ?? t.defaultLabel);
                        currentList[level] = BANDWIDTH_TIERS[level].defaultLabel;
                        const allDefault = currentList.every(
                          (item, idx) => !item || item === BANDWIDTH_TIERS[idx].defaultLabel,
                        );
                        setRatingLabelDraft("bandwidth", allDefault ? "" : currentList.join(","));
                      };

                      return BANDWIDTH_TIERS.map((tier) => (
                        <BandwidthTierCard
                          key={tier.level}
                          tier={tier}
                          customValue={rawParts[tier.level]}
                          disabled={!draft.showBandwidthRating}
                          onCommit={(val) => handleCommitTier(tier.level, val)}
                          onReset={() => handleResetTier(tier.level)}
                        />
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </InstancePanel>
        </>
      )}
    </div>
  );
}
