import { useMemo } from "react";
import { useAppearance } from "@/hooks/useAppearance";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  RotateCcw,
  Rows3,
  Search,
  Sliders,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { LatencyBars } from "@/components/node/LatencyBars";
import { QualityBars } from "@/components/node/QualityBars";
import { SettingSelect, ToggleRow } from "../components/SettingControls";
import { TaskBindingSection } from "../components/TaskBindingSection";
import {
  HOME_SORT_FIELDS,
  HOME_SORT_FIELD_LABELS,
} from "@/utils/homeSort";
import {
  STATUS_BAR_PRESETS,
  DEFAULT_CARD_METRIC_COLORS,
  type StatusBarPreset,
} from "@/utils/themeSettings";
import {
  buildTrafficQuotaSegmentColors,
} from "@/utils/metricTone";
import {
  HOMEPAGE_MULTI_PING_MIN_COUNT,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import {
  NODE_VIEW_MODE_OPTIONS,
  MOBILE_VIEW_MODE_OPTIONS,
  TRAFFIC_SPECTRUM_ANCHOR_CONFIG,
  LATENCY_TIER_CONFIG,
  LOSS_TIER_CONFIG,
  PREVIEW_LATENCY_BUCKETS,
  PREVIEW_LOSS_BUCKETS,
  EMPTY_ASSIGNED_CLIENTS,
  EMPTY_ADMIN_CLIENTS,
} from "../constants";
import type { ThemeDraft } from "../types";
import type { AdminClient, PingTask, PingLatencyThresholds } from "@/types/komari";

export function ServerTab({
  draft,
  patch,
  patchBindings,
  patchPingLatencyThreshold,
  patchPingLatencyColor,
  resetPingLatency,
  patchPingLossThreshold: _patchPingLossThreshold,
  patchPingLossColor,
  resetPingLossTier,
  resetPingLoss,
  patchTrafficSpectrumColor,
  patchMetricColor,
  resetMetricColors,
  applyStatusBarPreset,
  resetTrafficSpectrum,
  sortedTasks,
  filteredTasks,
  taskSearch,
  setTaskSearch,
  canAddMultiPingTask,
  addMultiPingTask,
  patchMultiPingTask,
  removeMultiPingTask,
  draftMultiPingInvalid,
  tasksLoading,
  clientsLoading,
  noTasksYet,
  noFilteredTaskMatch,
  expandedTaskId,
  toggleTaskExpanded,
  clientsById,
  visibleClients,
  assignedTaskByClientUuid,
  nodeSearch,
  setNodeSearch,
  orderedDraftGroups,
  moveGroup,
  draftHiddenNodes,
}: {
  draft: ThemeDraft;
  patch: <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void;
  patchBindings: (updater: (prev: HomepagePingTaskBindings) => HomepagePingTaskBindings) => void;
  patchPingLatencyThreshold: (key: keyof PingLatencyThresholds, val: number) => void;
  patchPingLatencyColor: (key: keyof ThemeDraft["pingLatencyColors"], color: string) => void;
  resetPingLatency: () => void;
  patchPingLossThreshold: (key: "low" | "medium", val: number) => void;
  patchPingLossColor: (key: keyof ThemeDraft["pingLossColors"], color: string) => void;
  resetPingLossTier?: (key: keyof ThemeDraft["pingLossColors"], defaultColor: string) => void;
  resetPingLoss: () => void;
  patchTrafficSpectrumColor: (key: keyof ThemeDraft["trafficSpectrumColors"], color: string) => void;
  patchMetricColor: (key: import("@/types/komari").MetricColorKey, color: string) => void;
  resetMetricColors: () => void;
  applyStatusBarPreset: (preset: StatusBarPreset) => void;
  resetTrafficSpectrum: () => void;
  sortedTasks: PingTask[];
  filteredTasks: PingTask[];
  taskSearch: string;
  setTaskSearch: (val: string) => void;
  canAddMultiPingTask: boolean;
  addMultiPingTask: () => void;
  patchMultiPingTask: (slot: number, rawValue: string) => void;
  removeMultiPingTask: (index: number) => void;
  draftMultiPingInvalid: boolean;
  tasksLoading: boolean;
  clientsLoading: boolean;
  noTasksYet: boolean;
  noFilteredTaskMatch: boolean;
  expandedTaskId: number | null;
  toggleTaskExpanded: (taskId: number) => void;
  clientsById: Map<string, AdminClient>;
  visibleClients: AdminClient[];
  assignedTaskByClientUuid: Map<string, string>;
  nodeSearch: string;
  setNodeSearch: (val: string) => void;
  orderedDraftGroups: string[];
  moveGroup: (index: number, direction: -1 | 1) => void;
  draftHiddenNodes: string[];
}) {
  const appearance = useAppearance();
  const isDark = appearance === "dark";

  const previewTrafficSegmentColors = useMemo(
    () => buildTrafficQuotaSegmentColors(draft.trafficSpectrumColors),
    [draft.trafficSpectrumColors],
  );

  return (
            <>
              {/* 面板 1: 默认视图 */}
              <InstancePanel
                kicker="视图"
                title="默认视图"
                aside={<LayoutGrid size={16} />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="surface-inset setting-segment-slot flex flex-col gap-3 px-4 py-4">
                    <div>
                      <div className="setting-subhead-title">
                        桌面端
                      </div>
                      <div className="mt-1 setting-hint">
                        适用于宽度大于 720px 的浏览器窗口。
                      </div>
                    </div>
                    <div className="instance-segmented is-prominent is-even">
                      {NODE_VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          data-active={draft.desktopNodeViewMode === value ? "true" : "false"}
                          aria-pressed={draft.desktopNodeViewMode === value}
                          onClick={() => patch("desktopNodeViewMode", value)}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <Icon size={14} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="surface-inset setting-segment-slot flex flex-col gap-3 px-4 py-4">
                    <div>
                      <div className="setting-subhead-title">
                        移动端
                      </div>
                      <div className="mt-1 setting-hint">
                        适用于宽度小于等于 720px 的手机或窄屏窗口。
                      </div>
                    </div>
                    <div className="instance-segmented is-prominent is-even">
                      {MOBILE_VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          data-active={draft.mobileNodeViewMode === value ? "true" : "false"}
                          aria-pressed={draft.mobileNodeViewMode === value}
                          onClick={() => patch("mobileNodeViewMode", value)}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <Icon size={14} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 2: 服务器卡片 */}
              <InstancePanel
                kicker="卡片"
                title="服务器卡片"
                description="选择服务器卡片的展示样式（立体双层或经典一体）。"
                aside={<LayoutTemplate size={16} />}
              >
                <div className="setting-mode-cards">
                  {[
                    {
                      value: "layered" as const,
                      label: "SAO 双层底座",
                      badge: "LAYERED TRAY",
                      desc: "卡片分上下两层：上层看硬件运行状态，底座单独看网络延迟。",
                      icon: Layers,
                    },
                    {
                      value: "classic" as const,
                      label: "LuminaPlus 经典",
                      badge: "CLASSIC",
                      desc: "传统单张卡片：网络延迟和硬件指标规整排列在同一张卡内。",
                      icon: LayoutTemplate,
                    },
                  ].map(({ value, label, badge, desc, icon: ModeIcon }) => {
                    const isActive = (draft.serverCardTemplate ?? "classic") === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => patch("serverCardTemplate", value)}
                        data-active={isActive ? "true" : "false"}
                        aria-pressed={isActive}
                        className="setting-mode-card"
                      >
                        <div className="setting-mode-card-head">
                          <div className="setting-mode-card-title">
                            <ModeIcon size={15} />
                            <span>{label}</span>
                            {badge && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                                {badge}
                              </span>
                            )}
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
              </InstancePanel>

              {/* 面板 3: 卡片指标 */}
              <InstancePanel
                kicker="指标"
                title="卡片指标"
                description="自定义服务器卡片上显示哪些参数与操作按钮。"
                aside={<Rows3 size={16} />}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    field="showGroupTabs"
                    title="分组标签"
                    desc="在服务器列表上方显示分组切换标签。"
                    checked={draft.showGroupTabs}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showRegionBar"
                    title="地区标签"
                    desc="在服务器列表上方显示国旗地区筛选。"
                    checked={draft.showRegionBar}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showCardGroup"
                    title="分组名称"
                    desc="在服务器卡片副标题标注所属分组。"
                    checked={draft.showCardGroup}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="compactShowTrafficTotal"
                    title="累计流量"
                    desc="在紧凑卡片中展示月度或累计总流量。"
                    checked={draft.compactShowTrafficTotal}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="compactShowBilling"
                    title="计费周期"
                    desc="在紧凑卡片中标注续费计费周期。"
                    checked={draft.compactShowBilling}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="compactShowUptime"
                    title="在线时长"
                    desc="在紧凑卡片中展示系统持续运行时间。"
                    checked={draft.compactShowUptime}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showConnections"
                    title="连接数量"
                    desc="在卡片网络区域标注实时网络连接数。"
                    checked={draft.showConnections}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showTodayTrafficPopover"
                    title="当日峰值"
                    desc="在卡片上显示按钮，查看当日流量与峰值。"
                    checked={draft.showTodayTrafficPopover}
                    onPatch={patch}
                  />
                </div>
              </InstancePanel>

              {/* 面板 4: 列表排序 */}
              <InstancePanel
                kicker="排序"
                title="列表排序"
                aside={<Rows3 size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <ToggleRow
                    field="enableHomeSort"
                    title="访客排序"
                    desc="允许访客在首页通过下拉菜单更改排序。"
                    checked={draft.enableHomeSort}
                    onPatch={patch}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">默认指标</span>
                      <SettingSelect
                        value={draft.homeSortField}
                        disabled={!draft.enableHomeSort}
                        onChange={(event) =>
                          patch(
                            "homeSortField",
                            event.target.value as (typeof HOME_SORT_FIELDS)[number],
                          )
                        }
                      >
                        {HOME_SORT_FIELDS.map((field) => (
                          <option key={field} value={field}>
                            {HOME_SORT_FIELD_LABELS[field]}
                          </option>
                        ))}
                      </SettingSelect>
                    </div>

                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">默认次序</span>
                      <SettingSelect
                        value={draft.homeSortDirection}
                        disabled={!draft.enableHomeSort}
                        onChange={(event) =>
                          patch("homeSortDirection", event.target.value as "asc" | "desc")
                        }
                      >
                        <option value="asc">升序</option>
                        <option value="desc">降序</option>
                      </SettingSelect>
                    </div>
                  </div>

                  {orderedDraftGroups.length > 0 && (
                    <div className="surface-inset flex flex-col gap-3 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="setting-subhead-title">分组次序</span>
                        <span className="setting-hint">点击上下箭头调整次序</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {orderedDraftGroups.map((group, index) => (
                          <div
                            key={group}
                            className="flex items-center justify-between rounded-lg border border-(--hairline) px-3 py-2 text-[13px]"
                          >
                            <span>{group}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveGroup(index, -1)}
                                className="theme-manage-button is-compact"
                                aria-label={`上移 ${group}`}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={index === orderedDraftGroups.length - 1}
                                onClick={() => moveGroup(index, 1)}
                                className="theme-manage-button is-compact"
                                aria-label={`下移 ${group}`}
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InstancePanel>

              {/* 面板 5: 隐藏节点 */}
              <InstancePanel
                kicker="过滤"
                title="隐藏节点"
                aside={<Search size={16} />}
              >
                <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                  <span className="setting-subhead-title">隐藏名单 (每行一个 UUID 或名称)</span>
                  <textarea
                    rows={4}
                    value={draft.hiddenNodesText}
                    onChange={(event) => patch("hiddenNodesText", event.target.value)}
                    placeholder="node-uuid-1&#10;Tokyo Edge"
                    className="surface-inset p-3 text-[13px] font-mono outline-none min-h-28"
                  />
                  <span className="setting-hint">
                    名单内的服务器不在首页呈现，已生效 {draftHiddenNodes.length} 台。
                  </span>
                </div>
              </InstancePanel>

              {/* 面板 6: 网络延迟 */}
              <InstancePanel
                kicker="延迟"
                title="网络延迟"
                description="选择网络延迟的展示方式，并为每台服务器指定测速线路。"
                aside={<Activity size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                    <span className="setting-subhead-title">展示模式</span>
                    <div className="instance-segmented is-prominent is-even is-stack-mobile">
                      <button
                        type="button"
                        data-active={!draft.enableHomepageMultiPing ? "true" : "false"}
                        onClick={() => patch("enableHomepageMultiPing", false)}
                      >
                        单线模式
                      </button>
                      <button
                        type="button"
                        data-active={draft.enableHomepageMultiPing ? "true" : "false"}
                        onClick={() => patch("enableHomepageMultiPing", true)}
                      >
                        多线模式
                      </button>
                    </div>
                    {(() => {
                      if (draft.enableHomepageMultiPing) return null;
                      const hasLoss = draft.overviewCards.includes("loss");
                      const hasYesterday = draft.overviewCards.includes("yesterdayBest");
                      const yesterdayScope = draft.yesterdayBestScope ?? "tri";

                      if (!hasLoss && !hasYesterday) return null;

                      let hintText = "";
                      if (hasLoss && hasYesterday) {
                        if (yesterdayScope === "tri") {
                          hintText = "💡 首页开启了三网卡片（三网丢包/稳定评分），单线无法区分三网，建议切到「多线模式」，或把稳定评分改为「全量」。";
                        } else {
                          hintText = "💡 首页开启了「三网丢包」卡片，单线无法显示三网；稳定评分仅反映节点各自表现。";
                        }
                      } else if (hasLoss) {
                        hintText = "💡 首页开启了「三网丢包」卡片，单线无法区分三网，建议切到「多线模式」查看数据。";
                      } else if (yesterdayScope === "tri") {
                        hintText = "💡 首页「稳定评分」当前考核三网，单线无法凑齐，建议切到「多线模式」，或在卡片设置中改为「全量」。";
                      } else {
                        hintText = "💡 提示：单线模式下各节点测速线路不同，评分仅反映各自独立表现。";
                      }

                      return (
                        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span>{hintText}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {draft.enableHomepageMultiPing ? (
                    <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="setting-subhead-title">多线槽位</span>
                          <p className="setting-hint mt-1">
                            卡片将依序展示各线路的实时延迟光柱。
                          </p>
                        </div>
                        {canAddMultiPingTask && (
                          <button
                            type="button"
                            onClick={addMultiPingTask}
                            className="theme-manage-button is-compact"
                          >
                            + 添加展示线路
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {draft.homepageMultiPingTaskIds.map((taskId, slot) => (
                          <div
                            key={slot}
                            className="flex items-center justify-between gap-2 rounded-[10px] border border-(--hairline) px-3 py-2 min-w-0"
                          >
                            <span className="text-[12px] font-medium text-(--text-secondary) shrink-0">
                              槽位 #{slot + 1}
                            </span>
                            <SettingSelect
                              value={String(taskId)}
                              onChange={(event) => patchMultiPingTask(slot, event.target.value)}
                              wrapperClassName="flex-1 min-w-0"
                            >
                              {sortedTasks.map((task) => (
                                <option key={task.id} value={task.id}>
                                  {task.name || `线路 #${task.id}`}
                                </option>
                              ))}
                            </SettingSelect>
                            {draft.homepageMultiPingTaskIds.length > HOMEPAGE_MULTI_PING_MIN_COUNT && (
                              <button
                                type="button"
                                onClick={() => removeMultiPingTask(slot)}
                                className="theme-manage-button is-compact is-danger shrink-0"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {draftMultiPingInvalid && (
                        <p className="mt-1 text-[11px] leading-relaxed text-(--status-error)" role="alert">
                          请至少选择 {HOMEPAGE_MULTI_PING_MIN_COUNT} 条有效的展示线路。
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
                        <label className="surface-inset flex items-center gap-2 px-3 py-2">
                          <Search size={14} className="text-(--text-tertiary)" />
                          <input
                            value={taskSearch}
                            onChange={(event) => setTaskSearch(event.target.value)}
                            placeholder="搜索 Ping 任务名称 / ID / 类型 / 目标"
                            aria-label="搜索 Ping 任务"
                            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--text-tertiary)"
                          />
                        </label>
                        <div className="surface-inset flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-(--text-secondary)">
                          <span>首页绑定总数</span>
                          <strong className="text-(--text-primary)">
                            {`${sortedTasks.length} 个任务`}
                          </strong>
                        </div>
                      </div>

                      <ToggleRow
                        field="fakePingForUnbound"
                        title="平滑占位"
                        desc="无探测数据时显示平滑占位，保持视觉整齐。"
                        checked={draft.fakePingForUnbound}
                        onPatch={patch}
                      />

                      {(tasksLoading || clientsLoading) && (
                        <div className="flex min-h-[20vh] items-center justify-center">
                          <Spinner size={24} />
                        </div>
                      )}

                      {noTasksYet && (
                        <div className="theme-manage-empty-state">
                          <span>当前还没有可用于首页展示的 Ping 任务。</span>
                          <a href="/admin/ping" className="theme-manage-inline-link">
                            前往后台 Ping 管理创建任务
                          </a>
                        </div>
                      )}

                      {noFilteredTaskMatch && (
                        <div className="surface-inset px-4 py-5 text-[13px] text-(--text-secondary)">
                          没有匹配的 Ping 任务。
                        </div>
                      )}

                      {!tasksLoading &&
                        !clientsLoading &&
                        !noTasksYet &&
                        filteredTasks.map((task) => {
                          const expanded = expandedTaskId === task.id;
                          return (
                            <TaskBindingSection
                              key={task.id}
                              task={task}
                              assigned={
                                draft.homepagePingBindings[String(task.id)] ?? EMPTY_ASSIGNED_CLIENTS
                              }
                              expanded={expanded}
                              clientsById={clientsById}
                              visibleClients={expanded ? visibleClients : EMPTY_ADMIN_CLIENTS}
                              assignedTaskByClientUuid={assignedTaskByClientUuid}
                              nodeSearch={expanded ? nodeSearch : ""}
                              onNodeSearch={setNodeSearch}
                              onToggleExpand={toggleTaskExpanded}
                              onPatchBindings={patchBindings}
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              </InstancePanel>

              {/* 面板 7: 卡片与状态配色 */}
              <InstancePanel
                kicker="配色"
                title="服务器与卡片配色"
                description="调整服务器卡片硬件指标（CPU、内存、磁盘等）、网络速率热力、流量光柱及延迟丢包成套方案与自定义色彩。"
                aside={<Sliders size={16} />}
              >
                <div className="flex flex-col gap-5">
                  {/* 顶置配套方案预设：一套方案联动覆盖卡片硬件、流量、延迟、丢包 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div>
                      <span className="setting-subhead-title">配套全套预设方案</span>
                      <p className="setting-hint mt-1">
                        一键联动设定 CPU、内存、磁盘硬件及流量、延迟、丢包光柱的整套视觉风格。
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {STATUS_BAR_PRESETS.map((preset) => {
                        const isTrafficMatch =
                          draft.trafficSpectrumColors.start === preset.colors.start &&
                          draft.trafficSpectrumColors.mid === preset.colors.mid &&
                          draft.trafficSpectrumColors.high === preset.colors.high &&
                          draft.trafficSpectrumColors.end === preset.colors.end;
                        const isLatencyMatch =
                          draft.pingLatencyColors.excellent === preset.latencyColors.excellent &&
                          draft.pingLatencyColors.good === preset.latencyColors.good &&
                          draft.pingLatencyColors.moderate === preset.latencyColors.moderate &&
                          draft.pingLatencyColors.elevated === preset.latencyColors.elevated &&
                          draft.pingLatencyColors.critical === preset.latencyColors.critical;
                        const isLossMatch =
                          draft.pingLossColors.zero === preset.lossColors.zero &&
                          ((draft.pingLossColors.loss ?? draft.pingLossColors.low ?? draft.pingLossColors.high) ===
                            (preset.lossColors.loss ?? preset.lossColors.low ?? preset.lossColors.high));
                        const isMetricMatch =
                          !draft.metricColors ||
                          (draft.metricColors.cpu === preset.metricColors.cpu &&
                            draft.metricColors.memory === preset.metricColors.memory &&
                            draft.metricColors.disk === preset.metricColors.disk);
                        const isSelected = isTrafficMatch && isLatencyMatch && isLossMatch && isMetricMatch;
                        const gradient = `linear-gradient(to right, ${preset.colors.start}, ${preset.colors.mid}, ${preset.colors.high}, ${preset.colors.end})`;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyStatusBarPreset(preset)}
                            data-active={isSelected ? "true" : "false"}
                            aria-pressed={isSelected}
                            className={clsx("setting-spectrum-preset-card", `is-${preset.id}`)}
                          >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              <span
                                className={clsx(
                                  "text-xs font-semibold truncate",
                                  isSelected
                                    ? preset.id === "aurora"
                                      ? "text-[#58a021] dark:text-[#82dd2d]"
                                      : preset.id === "divergence"
                                        ? "text-[#ea580c] dark:text-[#ff7700]"
                                        : preset.id === "eva"
                                          ? "text-[#7c3aed] dark:text-[#a855f7]"
                                          : preset.id === "default"
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-(--accent-500)"
                                    : "text-(--text-primary)",
                                )}
                              >
                                {preset.name}
                              </span>
                              <div className="setting-color-theme-radio" aria-hidden="true">
                                {isSelected && <div className="setting-color-theme-radio-dot" />}
                              </div>
                            </div>
                            {/* 硬件指标三色预览点 + 流量渐变条 */}
                            <div className="flex items-center gap-1.5 w-full">
                              <span
                                className="h-2 w-3.5 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/10 shrink-0"
                                style={{ background: preset.metricColors.cpu }}
                                title="CPU"
                              />
                              <span
                                className="h-2 w-3.5 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/10 shrink-0"
                                style={{ background: preset.metricColors.memory }}
                                title="内存"
                              />
                              <span
                                className="h-2 w-3.5 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/10 shrink-0"
                                style={{ background: preset.metricColors.disk }}
                                title="磁盘"
                              />
                              <div
                                className="h-2 flex-1 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/10"
                                style={{ background: gradient }}
                                title="网络光柱"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1. 卡片硬件指标配色 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">卡片硬件指标配色</span>
                        <p className="setting-hint mt-1">
                          自定义 CPU、内存、磁盘及系统负载的指标数字高亮与进度光条色彩。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetMetricColors}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认硬件指标配色"
                      >
                        <RotateCcw size={13} />
                        重置硬件配色
                      </button>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                        { key: "cpu" as const, label: "CPU", stage: "算力占用", hint: "卡片 CPU 指标文字与进度光条高亮" },
                        { key: "memory" as const, label: "内存", stage: "已用比例", hint: "卡片内存指标文字与已用光条高亮" },
                        { key: "disk" as const, label: "磁盘", stage: "存储容量", hint: "卡片磁盘指标文字与已用光条高亮" },
                        { key: "load" as const, label: "负载", stage: "系统负载", hint: "卡片负载指标文字与核数负载光条" },
                      ].map(({ key, label, stage, hint }) => {
                        const currentColor = draft.metricColors?.[key] ?? DEFAULT_CARD_METRIC_COLORS[key];
                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium bg-(--bg-primary) text-(--text-tertiary) border-(--hairline)">
                                {stage}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="relative flex items-center justify-center shrink-0 cursor-pointer">
                                <span
                                  className="inline-block h-7 w-7 rounded-full border-2 border-white/40 shadow-sm"
                                  style={{ backgroundColor: currentColor }}
                                />
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) => patchMetricColor(key, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  title={`选取${label}配色`}
                                />
                              </label>
                              <input
                                type="text"
                                maxLength={7}
                                value={currentColor}
                                onChange={(e) => patchMetricColor(key, e.target.value)}
                                className="surface-inset px-2.5 py-1 text-[12px] font-mono uppercase text-(--text-primary) w-full outline-none"
                                placeholder={DEFAULT_CARD_METRIC_COLORS[key]}
                              />
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 速率热力与流量方向 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div>
                      <span className="setting-subhead-title">速率热力与流量方向</span>
                      <p className="setting-hint mt-1">
                        自定义实时上下行网络速率、热力跳动指示点及上下行方向色。
                      </p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                      {[
                        { key: "speedIdle" as const, label: "超低速", stage: "空载", hint: "0 ~ 100 KB/s 速率热力点" },
                        { key: "speedLow" as const, label: "低速", stage: "轻载", hint: "100 KB/s ~ 1 MB/s 速率热力点" },
                        { key: "speedHigh" as const, label: "高速", stage: "较快", hint: "1 MB/s ~ 10 MB/s 速率热力点" },
                        { key: "speedMax" as const, label: "急速", stage: "高负荷", hint: "> 10 MB/s 速率热力点" },
                        { key: "trafficUp" as const, label: "上行", stage: "出站 ↑", hint: "上传速率文字与箭头颜色" },
                        { key: "trafficDown" as const, label: "下行", stage: "入站 ↓", hint: "下载速率文字与箭头颜色" },
                      ].map(({ key, label, stage, hint }) => {
                        const currentColor = draft.metricColors?.[key] ?? DEFAULT_CARD_METRIC_COLORS[key];
                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium bg-(--bg-primary) text-(--text-tertiary) border-(--hairline)">
                                {stage}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="relative flex items-center justify-center shrink-0 cursor-pointer">
                                <span
                                  className="inline-block h-7 w-7 rounded-full border-2 border-white/40 shadow-sm"
                                  style={{ backgroundColor: currentColor }}
                                />
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) => patchMetricColor(key, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  title={`选取${label}配色`}
                                />
                              </label>
                              <input
                                type="text"
                                maxLength={7}
                                value={currentColor}
                                onChange={(e) => patchMetricColor(key, e.target.value)}
                                className="surface-inset px-2.5 py-1 text-[12px] font-mono uppercase text-(--text-primary) w-full outline-none"
                                placeholder={DEFAULT_CARD_METRIC_COLORS[key]}
                              />
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. 流量进度光柱色谱自定义 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">流量光柱</span>
                        <p className="setting-hint mt-1">
                          从用量充裕到即将耗尽，呈现平滑过渡色谱。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetTrafficSpectrum}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认的监控绿色谱"
                      >
                        <RotateCcw size={13} />
                        重置色彩
                      </button>
                    </div>

                    {/* 就近实时预览：18 段发光光柱色谱全貌（置顶呈现） */}
                    <div className="flex flex-col gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-(--text-secondary) flex items-center gap-1.5">
                          <Sparkles size={13} className="text-(--accent-500)" />
                          流量光柱实时效果 (18 段)
                        </span>
                        <span className="text-[11px] text-(--text-tertiary)">
                          所见即所得 · 0% 充裕至 100% 耗尽连续色谱
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 rounded-md bg-(--bg-primary) p-2.5 shadow-inner">
                        <div className="flex items-center justify-between text-[11px] text-(--text-tertiary) mb-1">
                          <span>18 段发光光柱色谱全貌：</span>
                          <span className="font-mono">从轻载平滑过渡至耗尽终点</span>
                        </div>
                        <div className="traffic-quota-track" aria-hidden>
                          {previewTrafficSegmentColors.map((color, i) => (
                            <span key={i} className="traffic-quota-segment" style={{ background: color }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 4 锚点 HEX 输入网格 */}
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {TRAFFIC_SPECTRUM_ANCHOR_CONFIG.map(({ key, label, stage, hint, defaultColor }) => {
                        const currentColor = draft.trafficSpectrumColors[key];
                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium bg-(--bg-primary) text-(--text-tertiary) border-(--hairline)">
                                {stage}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="relative flex items-center justify-center shrink-0 cursor-pointer">
                                <span
                                  className="inline-block h-7 w-7 rounded-full border-2 border-white/40 shadow-sm"
                                  style={{ backgroundColor: currentColor }}
                                />
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) => patchTrafficSpectrumColor(key, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  title={`选取${label}`}
                                />
                              </label>
                              <input
                                type="text"
                                maxLength={7}
                                value={currentColor}
                                onChange={(e) => patchTrafficSpectrumColor(key, e.target.value)}
                                className="surface-inset px-2.5 py-1 text-[12px] font-mono uppercase text-(--text-primary) w-full outline-none"
                                placeholder={defaultColor}
                              />
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-(--hairline)">
                              <span className="text-[11px] text-(--text-secondary) shrink-0">
                                阶段定位
                              </span>
                              <span className="text-[11px] font-mono text-(--text-tertiary)">
                                平滑色谱锚点
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 延迟评级标准与色彩设置 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">延迟光柱</span>
                        <p className="setting-hint mt-1">
                          设定各毫秒区间的判断门槛与对应光柱颜色。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetPingLatency}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认的 60/100/160/200ms 及预设色"
                      >
                        <RotateCcw size={13} />
                        重置延迟
                      </button>
                    </div>

                    {/* 就近实时预览：延迟光柱 */}
                    <div className="flex flex-col gap-2 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[12px]">
                        <span className="font-medium text-(--text-secondary) flex items-center gap-1.5">
                          <Activity size={13} className="text-(--status-success)" />
                          延迟光柱实时效果 (示例梯度 15ms ~ 320ms)
                        </span>
                        <span className="tabular font-medium text-(--text-tertiary) text-[11px]">
                          门槛：{draft.pingLatencyThresholds.excellent}ms / {draft.pingLatencyThresholds.good}ms / {draft.pingLatencyThresholds.moderate}ms / {draft.pingLatencyThresholds.elevated}ms
                        </span>
                      </div>
                      <div className="rounded-md bg-(--bg-primary) p-2 shadow-inner">
                        <LatencyBars
                          buckets={PREVIEW_LATENCY_BUCKETS}
                          latencyThresholds={draft.pingLatencyThresholds}
                          latencyColors={draft.pingLatencyColors}
                          height={18}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {LATENCY_TIER_CONFIG.map(({ key, label, hint, defaultColor }) => {
                        const currentColor = draft.pingLatencyColors[key];
                        const isThresholdEditable = key !== "critical";
                        const thresholdVal = isThresholdEditable
                          ? draft.pingLatencyThresholds[key]
                          : null;

                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <label
                                  className="metric-color-swatch"
                                  style={{ background: currentColor }}
                                  title="点击调整颜色"
                                >
                                  <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => patchPingLatencyColor(key, e.target.value)}
                                  />
                                </label>
                                {currentColor.toLowerCase() !== defaultColor.toLowerCase() && (
                                  <button
                                    type="button"
                                    onClick={() => patchPingLatencyColor(key, defaultColor)}
                                    className="text-(--text-tertiary) hover:text-(--text-primary) transition-colors p-1"
                                    title="恢复该项默认色"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-(--hairline)">
                              <span className="text-[11px] text-(--text-secondary) shrink-0">
                                {isThresholdEditable ? "门槛上限" : "高延迟区间"}
                              </span>
                              {isThresholdEditable ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={9999}
                                    value={thresholdVal ?? 0}
                                    onChange={(e) => {
                                      const num = parseInt(e.target.value, 10);
                                      if (!Number.isNaN(num) && num > 0) {
                                        patchPingLatencyThreshold(key, num);
                                      }
                                    }}
                                    className="w-16 rounded-[5px] border border-(--hairline) bg-(--bg-primary) px-2 py-0.5 text-right font-mono text-[12px] font-medium outline-none focus:border-(--status-success)"
                                  />
                                  <span className="text-[11px] text-(--text-tertiary)">ms</span>
                                </div>
                              ) : (
                                <span className="font-mono text-[11px] text-(--text-tertiary)">
                                  &gt; {draft.pingLatencyThresholds.elevated}ms
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. 丢包评级标准与色彩设置 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">丢包光柱</span>
                        <p className="setting-hint mt-1">
                          设置网络正常与丢包时的光柱颜色及填充效果。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetPingLoss}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认光柱颜色与填充效果"
                      >
                        <RotateCcw size={13} />
                        重置丢包
                      </button>
                    </div>

                    {/* 就近实时预览：丢包光柱 */}
                    <div className="flex flex-col gap-2 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[12px]">
                        <span className="font-medium text-(--text-secondary) flex items-center gap-1.5">
                          <Activity size={13} className="text-(--status-warning)" />
                          效果实时预览
                        </span>
                        <span className="tabular font-medium text-(--text-tertiary) text-[11px]">
                          0% 正常 · &gt; 0% 丢包（{draft.enablePingLossHatch ? "斜纹填充" : "纯色填充"}）
                        </span>
                      </div>
                      <div className="rounded-md bg-(--bg-primary) p-2 shadow-inner">
                        <QualityBars
                          buckets={PREVIEW_LOSS_BUCKETS}
                          lossThresholds={draft.pingLossThresholds}
                          lossColors={draft.pingLossColors}
                          enablePingLossHatch={draft.enablePingLossHatch}
                          height={18}
                        />
                      </div>
                    </div>

                    {/* 丢包斜纹填充开关 */}
                    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-semibold text-(--text-primary)">
                          丢包使用斜纹填充
                        </span>
                        <span className="text-[12px] text-(--text-tertiary)">
                          丢包时以斜纹填充代替纯色实心，适合纯色主题保持视觉协调。关闭后显示为纯色实心。
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={draft.enablePingLossHatch}
                        onChange={(e) => patch("enablePingLossHatch", e.target.checked)}
                        className="theme-manage-checkbox shrink-0"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {LOSS_TIER_CONFIG.map(({ key, label, hint, defaultColor, condition }) => {
                        const effectiveDefaultColor = defaultColor || (key === "zero" ? "#10b981" : "#ef4444");
                        const currentColor =
                          (key === "zero"
                            ? draft.pingLossColors.zero
                            : (draft.pingLossColors.loss ?? draft.pingLossColors.low ?? draft.pingLossColors.high)) || effectiveDefaultColor;

                        const handleColorChange = (newColor: string) => {
                          patchPingLossColor(key, newColor);
                        };

                        const handleResetColor = () => {
                          if (resetPingLossTier) {
                            resetPingLossTier(key, effectiveDefaultColor);
                          } else {
                            handleColorChange(effectiveDefaultColor);
                            if (key !== "zero") {
                              patch("enablePingLossHatch", false);
                            }
                          }
                        };

                        const isHatchedSwatch = key !== "zero" && draft.enablePingLossHatch;
                        const isModified =
                          currentColor.toLowerCase() !== effectiveDefaultColor.toLowerCase() ||
                          (key !== "zero" && draft.enablePingLossHatch);

                        let swatchStyle: React.CSSProperties = { backgroundColor: currentColor };
                        let pickerValue = currentColor;

                        if (key !== "zero") {
                          const c = currentColor.trim().toLowerCase();
                          if (isHatchedSwatch) {
                            if (c === "#dce5da" || c === "#1c251b") {
                              swatchStyle = {
                                backgroundColor: isDark ? "#1c251b" : "#dce5da",
                                backgroundImage: isDark
                                  ? `repeating-linear-gradient(45deg, rgba(130, 221, 45, 0.35), rgba(130, 221, 45, 0.35) 2px, transparent 2px, transparent 4.5px)`
                                  : `repeating-linear-gradient(45deg, rgba(100, 125, 95, 0.45), rgba(100, 125, 95, 0.45) 2px, transparent 2px, transparent 4.5px)`,
                              };
                              pickerValue = isDark ? "#1c251b" : "#dce5da";
                            } else if (c === "#facc15" || c === "#24160e") {
                              swatchStyle = {
                                backgroundColor: isDark ? "#24160e" : "#facc15",
                                backgroundImage: isDark
                                  ? `repeating-linear-gradient(45deg, rgba(255, 119, 0, 0.45), rgba(255, 119, 0, 0.45) 2px, transparent 2px, transparent 4.5px)`
                                  : `repeating-linear-gradient(45deg, rgba(146, 64, 14, 0.75), rgba(146, 64, 14, 0.75) 2px, transparent 2px, transparent 4.5px)`,
                              };
                              pickerValue = isDark ? "#24160e" : "#facc15";
                            } else if (c === "#ef4444" || c === "#dc2626" || c === "#3b1616") {
                              swatchStyle = {
                                backgroundColor: isDark ? "#3b1616" : "#fee2e2",
                                backgroundImage: isDark
                                  ? `repeating-linear-gradient(45deg, rgba(248, 113, 113, 0.65), rgba(248, 113, 113, 0.65) 2px, transparent 2px, transparent 4.5px)`
                                  : `repeating-linear-gradient(45deg, rgba(220, 38, 38, 0.65), rgba(220, 38, 38, 0.65) 2px, transparent 2px, transparent 4.5px)`,
                              };
                              pickerValue = isDark ? "#3b1616" : "#fee2e2";
                            } else {
                              swatchStyle = {
                                backgroundColor: currentColor,
                                backgroundImage: isDark
                                  ? `repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.28) 2px, transparent 2px, transparent 4.5px)`
                                  : `repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.22) 2px, transparent 2px, transparent 4.5px)`,
                              };
                            }
                          } else {
                            if (isDark) {
                              if (c === "#dce5da" || c === "#1c251b") {
                                swatchStyle = { backgroundColor: "#1c251b" };
                                pickerValue = "#1c251b";
                              } else if (c === "#facc15" || c === "#24160e") {
                                swatchStyle = { backgroundColor: "#24160e" };
                                pickerValue = "#24160e";
                              }
                            }
                          }
                        }

                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-3 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <label
                                  className="metric-color-swatch"
                                  style={swatchStyle}
                                  title="点击调整颜色"
                                >
                                  <input
                                    type="color"
                                    value={pickerValue}
                                    onChange={(e) => handleColorChange(e.target.value)}
                                  />
                                </label>
                                {isModified && (
                                  <button
                                    type="button"
                                    onClick={handleResetColor}
                                    className="text-(--text-tertiary) hover:text-(--text-primary) transition-colors p-1"
                                    title={key === "zero" ? "恢复该项默认色" : "恢复默认纯色（关闭斜纹）"}
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[12px] text-(--text-tertiary) leading-normal">
                              {hint}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-(--hairline)">
                              <span className="text-[11px] text-(--text-secondary) shrink-0">
                                生效条件
                              </span>
                              <span className="font-mono text-[11px] text-(--text-tertiary)">
                                {condition}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </InstancePanel>
            </>

  );
}
