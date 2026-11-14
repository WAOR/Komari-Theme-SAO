import { Layers, Palette, LayoutGrid, Activity, Sparkles, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { MatrixPatternEditor } from "@/components/matrix/MatrixPatternEditor";
import { ToggleRow } from "../components/SettingControls";
import { BandwidthTierCard } from "../components/BandwidthTierCard";
import { OverviewCardPool } from "../components/OverviewCardPool";
import { COLOR_THEME_OPTIONS, BOOT_EFFECT_OPTIONS, BANDWIDTH_TIERS } from "../constants";
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
}) {
  return (
    <>
      <InstancePanel
        kicker="总览"
        title="监控总览"
        aside={<Layers size={16} />}
      >
        <ToggleRow
          field="showHomeOverview"
          title="监控总览"
          desc="在首页顶部展示监控总览模块。"
          checked={draft.showHomeOverview}
          onPatch={patch}
        />

        {(draft.showHomeOverview ?? true) && (
          <div className="mt-4 flex flex-col gap-5">
            {/* 模块 1：配色方案 */}
            <div
              className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs"
              data-palette={draft.matrixColorTheme || "default"}
            >
              <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-(--hairline)">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                    <Palette size={14} className="text-(--accent-500)" />
                    <span>配色方案</span>
                  </div>
                  <p className="text-[11px] text-(--text-muted) mt-0.5">
                    一键更换整站配色，同时应用到顶部卡片和右侧大盘。
                  </p>
                </div>
                {(() => {
                  const currentOpt =
                    COLOR_THEME_OPTIONS.find(
                      (opt) => opt.id === (draft.matrixColorTheme ?? "default"),
                    ) ?? COLOR_THEME_OPTIONS[0];
                  return (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${currentOpt.badgeClass}`}
                    >
                      {currentOpt.badge}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {COLOR_THEME_OPTIONS.map((opt) => {
                  const isSelected = (draft.matrixColorTheme ?? "default") === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch("matrixColorTheme", opt.id)}
                      data-active={isSelected ? "true" : "false"}
                      aria-pressed={isSelected}
                      className={`setting-color-theme-card ${
                        opt.id === "eva" ? "is-eva" : opt.id === "divergence" ? "is-divergence" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex items-center gap-1 shrink-0 p-1 rounded-md bg-(--bg-card) border border-(--hairline)">
                          {opt.colors.map((c, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-xs"
                              style={{ backgroundColor: c }}
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
            </div>

            {/* 模块 2：指标小卡定制（6 槽位 + 备选抽屉） */}
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

            {/* 模块 3：右侧 · 首页大盘样式 */}
            <div
              id="set-cluster-overview-mode"
              className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-(--hairline)">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                    <span>SAO 集群状态模块</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                      {draft.clusterOverviewMode === "nodes" ? "SAO 方格矩阵" : "SAO 趋势大盘"}
                    </span>
                  </div>
                  <p className="text-[11px] text-(--text-muted) mt-0.5">
                    首页右侧核心区域的展现形式，可选择趋势大盘或方格矩阵。
                  </p>
                </div>
              </div>

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
                  const isActive = (draft.clusterOverviewMode ?? "classic") === value;
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

              {/* 当切换到「方格矩阵」时，直接在容器内展开专属定制项 */}
              {draft.clusterOverviewMode === "nodes" && (
                <div className="mt-4 pt-4 border-t border-(--hairline) space-y-4">
                  {/* 1. SAO 主题开场动画 */}
                  <div>
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
                      <div className="mt-3.5 space-y-4">
                        {/* 动效形式独立选择器 */}
                        <div className="rounded-xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-3 sm:p-3.5">
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div>
                              <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                                <span>动效样式</span>
                                {(() => {
                                  const currentEffect =
                                    BOOT_EFFECT_OPTIONS.find(
                                      (e) => e.id === (draft.matrixBootEffect ?? "laser-scan"),
                                    ) ?? BOOT_EFFECT_OPTIONS[0];
                                  return (
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${currentEffect.badgeClass}`}
                                    >
                                      {currentEffect.badge}
                                    </span>
                                  );
                                })()}
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
                          colorTheme={draft.matrixColorTheme ?? "default"}
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

                  {/* 2. 模拟数据填充空闲机位插槽 */}
                  <div className="pt-3.5 border-t border-(--hairline)">
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
                        checked={draft.matrixMockFill ?? false}
                        onChange={(event) => patch("matrixMockFill", event.target.checked)}
                        className="h-4 w-4 shrink-0 accent-(--accent-500)"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 模块 4：SAO 带宽评级徽章 */}
            <div
              id="set-bandwidth-rating"
              className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                    <Activity size={14} className="text-(--accent-500)" />
                    <span>SAO 带宽评级徽章</span>
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
                  </div>
                </div>
              </div>

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
                    "rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs transition-opacity",
                    !draft.showBandwidthRating && "opacity-60",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-(--hairline)">
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
                    data-palette={draft.matrixColorTheme || "default"}
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
            </div>
          </div>
        )}
      </InstancePanel>
    </>
  );
}
