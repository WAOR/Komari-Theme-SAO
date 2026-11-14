import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, HelpCircle, LayoutGrid, PackagePlus, RotateCcw, Settings, Sparkles, X } from "lucide-react";
import { OverviewStatCard, type OverviewData } from "@/components/node/OverviewStatCard";
import {
  ALL_OVERVIEW_CARD_IDS,
  DEFAULT_OVERVIEW_CARDS,
  OVERVIEW_CARD_SLOT_COUNT,
} from "@/utils/themeSettings";
import {
  OVERVIEW_VISUAL_MODE_OPTIONS,
} from "../constants";
import type { ThemeDraft } from "../types";
import type { NodeInfo, OverviewCardId } from "@/types/komari";
import type { HourlyTrafficBucket } from "@/utils/trafficStats";
import { CarrierLossConfigModal } from "./CarrierLossConfigModal";
import { AssetCurrencyConfigModal } from "./AssetCurrencyConfigModal";
import { clearYesterdayBestDisplayCache } from "@/utils/yesterdayBestNode";
import type { calculateCostSummary } from "@/utils/cost";

const OVERVIEW_CARD_LABELS: Record<string, string> = {
  nodes: "节点在线",
  traffic: "今日流量",
  cpu: "平均 CPU",
  ram: "内存分配",
  disk: "系统磁盘",
  bandwidth: "实时带宽",
  connections: "活跃连接",
  uptime: "持续运行",
  asset: "资产总值",
  loss: "三网丢包",
  process: "系统进程",
  cores: "CPU 核心",
  swap: "虚拟内存",
  yesterdayBest: "稳定评分",
};

export function OverviewCardPool({
  draft,
  patch,
  realOverview,
  realCostSummary,
  todayTrafficTotal,
  todayTrafficHourly,
  todayTrafficPending,
  allNodes = [],
  exchangeRates,
  handleSave,
}: {
  draft: ThemeDraft;
  patch: <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void;
  handleSave?: (overrideDraft?: ThemeDraft) => Promise<void>;
  realOverview: OverviewData | undefined;
  realCostSummary: ReturnType<typeof calculateCostSummary> | null;
  todayTrafficTotal: number | null;
  todayTrafficHourly: HourlyTrafficBucket[] | null;
  todayTrafficPending: boolean;
  allNodes?: NodeInfo[];
  exchangeRates?: Record<string, number>;
}) {
  const [isCarrierLossModalOpen, setIsCarrierLossModalOpen] = useState(false);
  const [isYesterdayBestModalOpen, setIsYesterdayBestModalOpen] = useState(false);
  const [isAssetCurrencyModalOpen, setIsAssetCurrencyModalOpen] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const handleOpenYesterdayBestHelp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!next.get("view")) {
          next.set("view", "theme-manage");
        }
        next.set("tab", "feedback");
        next.set("faq", "yesterday-best-line-boundaries");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);
  const [draggingCard, setDraggingCard] = useState<{
    source: "slot" | "pool";
    cardId: OverviewCardId;
    slotIndex?: number;
  } | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const currentOverviewCards = useMemo(() => {
    const list = draft.overviewCards ?? DEFAULT_OVERVIEW_CARDS;
    if (list.length >= OVERVIEW_CARD_SLOT_COUNT) {
      return list.slice(0, OVERVIEW_CARD_SLOT_COUNT);
    }
    const needed = OVERVIEW_CARD_SLOT_COUNT - list.length;
    const pool = ALL_OVERVIEW_CARD_IDS.filter((id) => !list.includes(id));
    return [...list, ...pool.slice(0, needed)];
  }, [draft.overviewCards]);
  const selectedCardId = selectedSlotIndex !== null ? currentOverviewCards[selectedSlotIndex] : null;
  const selectedCardLabel = selectedCardId ? (OVERVIEW_CARD_LABELS[selectedCardId] || selectedCardId) : "";

  // 方案 A：闲置卡池维护动态状态，实现 1 对 1 原地对调替换
  const [poolCards, setPoolCards] = useState<OverviewCardId[]>(() => {
    const inUse = new Set(currentOverviewCards);
    return ALL_OVERVIEW_CARD_IDS.filter((id) => !inUse.has(id));
  });

  // 保持闲置卡池的自然顺序，同时确保与展示卡池互斥且互补
  useEffect(() => {
    setPoolCards((prev) => {
      const inUse = new Set(currentOverviewCards);
      const filtered = prev.filter((id) => !inUse.has(id));
      const seen = new Set(filtered);
      for (const id of ALL_OVERVIEW_CARD_IDS) {
        if (!inUse.has(id) && !seen.has(id)) {
          filtered.push(id);
          seen.add(id);
        }
      }
      if (
        filtered.length === prev.length &&
        filtered.every((id, i) => id === prev[i])
      ) {
        return prev;
      }
      return filtered;
    });
  }, [currentOverviewCards]);

  const swapSlots = useCallback(
    (indexA: number, indexB: number) => {
      if (indexA === indexB) return;
      const next = [...currentOverviewCards];
      const temp = next[indexA];
      next[indexA] = next[indexB];
      next[indexB] = temp;
      patch("overviewCards", next);
    },
    [currentOverviewCards, patch],
  );

  // 1 对 1 原地互换：换下的卡片精准落到被选中闲置卡原本的位置
  const replaceSlot = useCallback(
    (slotIndex: number, newCardId: OverviewCardId) => {
      const oldCardId = currentOverviewCards[slotIndex];
      if (!oldCardId || oldCardId === newCardId) return;

      const next = [...currentOverviewCards];
      next[slotIndex] = newCardId;
      patch("overviewCards", next);

      setPoolCards((prev) => {
        const nextPool = [...prev];
        const targetIndex = nextPool.indexOf(newCardId);
        if (targetIndex !== -1) {
          nextPool[targetIndex] = oldCardId;
        } else {
          nextPool.push(oldCardId);
        }
        return nextPool;
      });

      setSelectedSlotIndex(null);
    },
    [currentOverviewCards, patch],
  );

  // 闲置卡池内部卡片之间也可拖拽互换顺序
  const swapPoolCards = useCallback((cardIdA: OverviewCardId, cardIdB: OverviewCardId) => {
    if (cardIdA === cardIdB) return;
    setPoolCards((prev) => {
      const idxA = prev.indexOf(cardIdA);
      const idxB = prev.indexOf(cardIdB);
      if (idxA === -1 || idxB === -1) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
      return next;
    });
  }, []);

  const resetOverviewCards = useCallback(() => {
    patch("overviewCards", [...DEFAULT_OVERVIEW_CARDS]);
    const inUse = new Set(DEFAULT_OVERVIEW_CARDS);
    setPoolCards(ALL_OVERVIEW_CARD_IDS.filter((id) => !inUse.has(id)));
    setSelectedSlotIndex(null);
  }, [patch]);

  const toggleCardMicroVisual = useCallback((cardId: OverviewCardId) => {
    const staticList = draft.overviewStaticCards ?? [];
    const isCurrentlyStatic = staticList.includes(cardId);
    if (isCurrentlyStatic) {
      patch("overviewStaticCards", staticList.filter((id) => id !== cardId));
    } else {
      patch("overviewStaticCards", [...staticList, cardId]);
    }
  }, [draft.overviewStaticCards, patch]);

  const todayTrafficLoading = todayTrafficPending;

  return (
    <div
      className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-3 sm:p-5 shadow-xs"
      data-palette={draft.matrixColorTheme || "default"}
    >
                      {/* 模块头部：标题 + 状态角标 + 恢复默认按钮 */}
                      <div className="flex items-start justify-between gap-3 pb-3.5 mb-4 border-b border-(--hairline)">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                            <span>SAO 指标卡池模块</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                              固定 6 槽位
                            </span>
                          </div>
                          <p className="text-[11px] text-(--text-muted) mt-0.5">
                            显示在首页顶部的核心数据卡片。点击任意两张卡可对调顺序，也可以从下方备选池点击替换。
                          </p>
                        </div>
                        <button
                          type="button"
                          className="theme-reset-pill-btn shrink-0 whitespace-nowrap"
                          onClick={resetOverviewCards}
                          title="恢复官方默认 6 张卡片配置与排序"
                        >
                          <RotateCcw size={12} strokeWidth={2.2} />
                          <span>重置</span>
                        </button>
                      </div>

                      {/* 小卡视觉呈现模式（智能切换 / 图形卡片 / 文字卡片） */}
                      <div className="flex flex-col gap-2 mb-4 p-3 rounded-xl bg-(--bg-card) border border-(--hairline)">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-(--text-secondary) shrink-0">指标卡片呈现</span>
                          <span className="text-[10px] text-(--text-muted) truncate max-w-50 sm:max-w-none text-right" title={OVERVIEW_VISUAL_MODE_OPTIONS.find((o) => o.id === (draft.overviewCardVisualMode ?? "visual"))?.desc}>
                            {OVERVIEW_VISUAL_MODE_OPTIONS.find((o) => o.id === (draft.overviewCardVisualMode ?? "visual"))?.desc}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[color-mix(in_srgb,var(--surface-elev)_70%,transparent)] border border-(--hairline)">
                          {OVERVIEW_VISUAL_MODE_OPTIONS.map((opt) => {
                            const active = (draft.overviewCardVisualMode ?? "visual") === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => patch("overviewCardVisualMode", opt.id)}
                                className={`py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer text-center flex items-center justify-center whitespace-nowrap ${
                                  active
                                    ? "bg-(--bg-card) text-(--text-primary) shadow-xs font-semibold"
                                    : "text-(--text-muted) hover:text-(--text-secondary)"
                                }`}
                              >
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 1. 首页 6 槽位虚线卡片网格 (3x2 布局，1:1 所见即所得) */}
                      <div className="rounded-xl border border-dashed border-(--hairline) bg-[color-mix(in_srgb,var(--surface-elev)_75%,var(--bg-card))] p-1.5 sm:p-3.5 mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <LayoutGrid size={13} className="text-(--text-muted)" />
                            <span className="text-[11px] font-semibold text-(--text-secondary)">
                              展示卡池
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-(--hairline) bg-(--bg-card) text-(--text-muted)">
                              6 槽展示中
                            </span>
                          </div>
                          <span className="text-[10px] text-(--text-muted)">
                            <span className="theme-manage-guide-mouse">拖拽调序，点击对调或更换</span>
                            <span className="theme-manage-guide-touch">点两张卡对调，点闲置卡更换</span>
                          </span>
                        </div>

                        {selectedSlotIndex !== null && (
                          <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-(--accent-500)/10 border border-(--accent-500)/30 flex items-center justify-between gap-2 shadow-xs transition-all animate-fade-in">
                            <div className="flex items-center gap-1.5 min-w-0 text-xs">
                              <span className="inline-flex items-center justify-center h-4.5 px-2 text-[11px] font-medium rounded-full bg-(--accent-500) text-white shrink-0">
                                {selectedCardLabel}
                              </span>
                              <span className="font-semibold text-(--accent-500) shrink-0">
                                已选中
                              </span>
                              <span className="text-[11px] text-(--text-secondary) truncate">
                                点其他卡对调位置，或点下方备选卡换入
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSlotIndex(null);
                              }}
                              className="p-1 rounded-md text-(--text-muted) hover:text-(--text-primary) hover:bg-(--accent-500)/20 transition-colors cursor-pointer shrink-0"
                              title="取消选择"
                              aria-label="取消选择"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        <div
                          className="grid grid-cols-2 md:grid-cols-3 gap-1.5 sm:gap-3 mao-stat-grid"
                          data-visual-mode={draft.overviewCardVisualMode || "adaptive"}
                          data-palette={draft.matrixColorTheme || "default"}
                        >
                          {currentOverviewCards.map((cardId, slotIndex) => {
                            const isBeingDragged = draggingCard?.source === "slot" && draggingCard.slotIndex === slotIndex;
                            const isDragOver = dragOverSlotIndex === slotIndex;
                            const isSelected = selectedSlotIndex === slotIndex;

                            return (
                              <div
                                key={`slot-${slotIndex}-${cardId}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverSlotIndex !== slotIndex) setDragOverSlotIndex(slotIndex);
                                }}
                                onDragLeave={() => {
                                  if (dragOverSlotIndex === slotIndex) setDragOverSlotIndex(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverSlotIndex(null);
                                  if (!draggingCard) return;
                                  if (draggingCard.source === "slot") {
                                    if (draggingCard.slotIndex !== undefined) {
                                      swapSlots(draggingCard.slotIndex, slotIndex);
                                    }
                                  } else if (draggingCard.source === "pool") {
                                    replaceSlot(slotIndex, draggingCard.cardId);
                                  }
                                  setDraggingCard(null);
                                }}
                                onClick={() => {
                                  if (selectedSlotIndex === null) {
                                    setSelectedSlotIndex(slotIndex);
                                  } else if (selectedSlotIndex === slotIndex) {
                                    setSelectedSlotIndex(null);
                                  } else {
                                    swapSlots(selectedSlotIndex, slotIndex);
                                    setSelectedSlotIndex(null);
                                  }
                                }}
                                className={`group relative rounded-xl sm:rounded-2xl border sm:border-2 border-dashed p-0.5 sm:p-1.5 theme-manage-stat-slot transition-all select-none cursor-pointer ${
                                  isDragOver
                                    ? "border-(--accent-500) bg-(--accent-500)/15 scale-[1.02] shadow-lg ring-2 ring-(--accent-500)/40"
                                    : isSelected
                                      ? "border-(--accent-500) bg-(--accent-500)/10 ring-2 ring-(--accent-500)/50 shadow-md"
                                      : "border-(--hairline) bg-(--surface-elev)/50 hover:border-(--accent-500)/50 hover:bg-(--surface-elev)/80"
                                }`}
                              >
                                {/* 右上角操作区：动静态微图切换（若支持） + 设置齿轮（若有独立配置） + 槽位序号徽章 */}
                                <div className="absolute top-2 right-1.5 sm:top-3 sm:right-3 z-10 flex items-center gap-1 sm:gap-1.5">
                                  {["bandwidth", "cpu", "connections", "traffic", "loss", "disk"].includes(cardId) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCardMicroVisual(cardId);
                                      }}
                                      className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                      title={
                                        (draft.overviewStaticCards ?? []).includes(cardId)
                                          ? "当前：静态美化微图，点击切换为动态真实数据"
                                          : "当前：动态真实数据，点击切换为静态美化微图"
                                      }
                                      aria-label={
                                        (draft.overviewStaticCards ?? []).includes(cardId)
                                          ? "切换为动态真实数据"
                                          : "切换为静态美化微图"
                                      }
                                    >
                                      {(draft.overviewStaticCards ?? []).includes(cardId) ? (
                                        <Sparkles size={10} className="sm:w-2.75 sm:h-2.75" />
                                      ) : (
                                        <Activity size={10} className="sm:w-2.75 sm:h-2.75" />
                                      )}
                                    </button>
                                  )}
                                  {cardId === "loss" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCarrierLossModalOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                      title="配置三网丢包参与计算的服务器"
                                      aria-label="配置三网丢包参与计算的服务器"
                                    >
                                      <Settings size={10} className="sm:w-2.75 sm:h-2.75" />
                                    </button>
                                  )}
                                  {cardId === "yesterdayBest" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={handleOpenYesterdayBestHelp}
                                        className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                        title="查看测速线路变更与计分边界说明"
                                        aria-label="查看测速线路变更与计分边界说明"
                                      >
                                        <HelpCircle size={10} className="sm:w-2.75 sm:h-2.75" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsYesterdayBestModalOpen(true);
                                        }}
                                        className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                        title="配置稳定评分参与评分的服务器"
                                        aria-label="配置稳定评分参与评分的服务器"
                                      >
                                        <Settings size={10} className="sm:w-2.75 sm:h-2.75" />
                                      </button>
                                    </>
                                  )}
                                  {cardId === "asset" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAssetCurrencyModalOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                      title="配置资产总值显示货币单位"
                                      aria-label="配置资产总值显示货币单位"
                                    >
                                      <Settings size={10} className="sm:w-2.75 sm:h-2.75" />
                                    </button>
                                  )}
                                  
                                </div>

                                {/* 所见即所得：真实指标卡实体，支持拖拽 */}
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", cardId);
                                    setDraggingCard({ source: "slot", cardId, slotIndex });
                                  }}
                                  onDragEnd={() => {
                                    setDraggingCard(null);
                                    setDragOverSlotIndex(null);
                                  }}
                                  className={`transition-opacity cursor-grab active:cursor-grabbing ${
                                    isBeingDragged ? "opacity-30" : "opacity-100"
                                  }`}
                                  title="按住卡片直接拖动调换顺序，或点击选中后在下方选择替换"
                                >
                                  <OverviewStatCard
                                    cardId={cardId}
                                    overview={realOverview}
                                    costSummary={realCostSummary}
                                    costCurrency={draft.costCurrency}
                                    exchangeRates={exchangeRates}
                                    todayTrafficTotal={todayTrafficTotal}
                                    todayTrafficLoading={todayTrafficLoading}
                                    todayTrafficHourly={todayTrafficHourly}
                                    microVisualMode={
                                      (draft.overviewStaticCards ?? []).includes(cardId)
                                        ? "static"
                                        : "dynamic"
                                    }
                                    className="w-full pointer-events-none shadow-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. 备选指标卡片池 (明确作为指标小卡的内嵌收纳抽屉) */}
                      <div className="rounded-xl border border-dashed border-(--hairline) bg-[color-mix(in_srgb,var(--surface-elev)_75%,var(--bg-card))] p-1.5 sm:p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <PackagePlus size={13} className="text-(--text-muted)" />
                            <span className="text-[11px] font-semibold text-(--text-secondary)">
                              闲置卡池
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-(--hairline) bg-(--bg-card) text-(--text-muted)">
                              {poolCards.length} 张可用
                            </span>
                          </div>
                          <span className="text-[10px] text-(--text-muted)">
                            {selectedSlotIndex !== null ? (
                              <span className="text-(--accent-500) font-medium">
                                点击备选卡直接换入「{selectedCardLabel}」
                              </span>
                            ) : (
                              <>
                                <span className="theme-manage-guide-mouse">
                                  拖入上方或点击换入
                                </span>
                                <span className="theme-manage-guide-touch">
                                  点上方卡片后点此换入
                                </span>
                              </>
                            )}
                          </span>
                        </div>

                        <div
                          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2.5 mao-stat-grid"
                          data-visual-mode={draft.overviewCardVisualMode || "adaptive"}
                          data-palette={draft.matrixColorTheme || "default"}
                        >
                          {poolCards.map((cardId) => {
                            const isBeingDragged = draggingCard?.source === "pool" && draggingCard.cardId === cardId;

                            return (
                              <div
                                key={`pool-${cardId}`}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", cardId);
                                  setDraggingCard({ source: "pool", cardId });
                                }}
                                onDragEnd={() => {
                                  setDraggingCard(null);
                                  setDragOverSlotIndex(null);
                                }}
                                onDragOver={(e) => {
                                  if (
                                    draggingCard?.source === "slot" ||
                                    (draggingCard?.source === "pool" && draggingCard.cardId !== cardId)
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                                onDrop={(e) => {
                                  if (draggingCard?.source === "slot" && draggingCard.slotIndex !== undefined) {
                                    e.preventDefault();
                                    replaceSlot(draggingCard.slotIndex, cardId);
                                    setDraggingCard(null);
                                  } else if (draggingCard?.source === "pool" && draggingCard.cardId !== cardId) {
                                    e.preventDefault();
                                    swapPoolCards(draggingCard.cardId, cardId);
                                    setDraggingCard(null);
                                  }
                                }}
                                onClick={() => {
                                  if (selectedSlotIndex !== null) {
                                    replaceSlot(selectedSlotIndex, cardId);
                                  }
                                }}
                                className={`relative rounded-xl transition-all cursor-grab active:cursor-grabbing select-none theme-manage-stat-slot ${
                                  isBeingDragged ? "opacity-30 scale-95" : "opacity-90 hover:opacity-100 hover:scale-[1.01]"
                                } ${
                                  selectedSlotIndex !== null
                                    ? "ring-2 ring-(--accent-500)/60 shadow-md cursor-pointer hover:ring-(--accent-500)"
                                    : ""
                                }`}
                                title={
                                  selectedSlotIndex !== null
                                    ? `点击换入「${selectedCardLabel}」所在位置`
                                    : "按住拖拽至上方进行替换"
                                }
                              >
                                {/* 闲置卡池：动静态微图切换 + 独立配置齿轮 */}
                                <div className="absolute top-2 right-1.5 sm:top-3 sm:right-3 z-10 flex items-center gap-1 sm:gap-1.5">
                                  {["bandwidth", "cpu", "connections", "traffic", "loss", "disk"].includes(cardId) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCardMicroVisual(cardId);
                                      }}
                                      className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                      title={
                                        (draft.overviewStaticCards ?? []).includes(cardId)
                                          ? "当前：静态美化微图，点击切换为动态真实数据"
                                          : "当前：动态真实数据，点击切换为静态美化微图"
                                      }
                                      aria-label={
                                        (draft.overviewStaticCards ?? []).includes(cardId)
                                          ? "切换为动态真实数据"
                                          : "切换为静态美化微图"
                                      }
                                    >
                                      {(draft.overviewStaticCards ?? []).includes(cardId) ? (
                                        <Sparkles size={10} className="sm:w-2.75 sm:h-2.75" />
                                      ) : (
                                        <Activity size={10} className="sm:w-2.75 sm:h-2.75" />
                                      )}
                                    </button>
                                  )}
                                  {cardId === "loss" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCarrierLossModalOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                      title="配置三网丢包参与计算的服务器"
                                      aria-label="配置三网丢包参与计算的服务器"
                                    >
                                      <Settings size={10} className="sm:w-2.75 sm:h-2.75" />
                                    </button>
                                  )}
                                  {cardId === "yesterdayBest" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={handleOpenYesterdayBestHelp}
                                        className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                        title="查看测速线路变更与计分边界说明"
                                        aria-label="查看测速线路变更与计分边界说明"
                                      >
                                        <HelpCircle size={10} className="sm:w-2.75 sm:h-2.75" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsYesterdayBestModalOpen(true);
                                        }}
                                        className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                        title="配置稳定评分参与评分的服务器"
                                        aria-label="配置稳定评分参与评分的服务器"
                                      >
                                        <Settings size={10} className="sm:w-2.75 sm:h-2.75" />
                                      </button>
                                    </>
                                  )}
                                  {cardId === "asset" && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAssetCurrencyModalOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center w-4.5 h-4 sm:w-5.5 sm:h-4.5 rounded-full backdrop-blur-sm border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) hover:text-(--accent-500) hover:border-(--accent-500)/50 hover:bg-(--accent-500)/10 shadow-xs transition-all cursor-pointer"
                                      title="配置资产总值显示货币单位"
                                      aria-label="配置资产总值显示货币单位"
                                    >
                                      <Settings size={10} className="sm:w-2.75 sm:h-2.75" />
                                    </button>
                                  )}
                                </div>
                                <OverviewStatCard
                                  cardId={cardId}
                                  overview={realOverview}
                                  costSummary={realCostSummary}
                                  costCurrency={draft.costCurrency}
                                  exchangeRates={exchangeRates}
                                  todayTrafficTotal={todayTrafficTotal}
                                  todayTrafficLoading={todayTrafficLoading}
                                  todayTrafficHourly={todayTrafficHourly}
                                  microVisualMode={
                                    (draft.overviewStaticCards ?? []).includes(cardId)
                                      ? "static"
                                      : "dynamic"
                                  }
                                  className="w-full pointer-events-none shadow-xs"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 三网丢包卡片专属配置弹窗 */}
                      <CarrierLossConfigModal
                        isOpen={isCarrierLossModalOpen}
                        onClose={() => setIsCarrierLossModalOpen(false)}
                        allNodes={allNodes}
                        includedNodeUuids={draft.carrierLossIncludedNodes ?? []}
                        groupOrder={draft.homeGroupOrder}
                        onSave={(nodes) => patch("carrierLossIncludedNodes", nodes)}
                      />

                      {/* 稳定评分卡片专属节点配置弹窗 */}
                      <CarrierLossConfigModal
                        isOpen={isYesterdayBestModalOpen}
                        onClose={() => setIsYesterdayBestModalOpen(false)}
                        allNodes={allNodes}
                        includedNodeUuids={draft.yesterdayBestIncludedNodes ?? []}
                        groupOrder={draft.homeGroupOrder}
                        title="稳定评分卡片设置"
                        description="选择评分线路与封面展现指标，并勾选参与评分的服务器。"
                        showScopeSelector={true}
                        scope={draft.yesterdayBestScope ?? "tri"}
                        displayMode={draft.yesterdayBestDisplayMode ?? "best"}
                        onSave={(nodes, scope, displayMode) => {
                          // 配置变更时立即失效并清理展示缓存与内存缓存，杜绝旧参评机器幽灵回显
                          clearYesterdayBestDisplayCache();

                          const nextPatch: Partial<ThemeDraft> = {
                            yesterdayBestIncludedNodes: nodes,
                            ...(scope ? { yesterdayBestScope: scope } : {}),
                            ...(displayMode ? { yesterdayBestDisplayMode: displayMode } : {}),
                          };
                          patch("yesterdayBestIncludedNodes", nodes);
                          if (scope) {
                            patch("yesterdayBestScope", scope);
                          }
                          if (displayMode) {
                            patch("yesterdayBestDisplayMode", displayMode);
                          }
                          void handleSave?.({ ...draft, ...nextPatch });
                        }}
                      />

                      {/* 资产总值卡片专属货币单位配置弹窗 */}
                      <AssetCurrencyConfigModal
                        isOpen={isAssetCurrencyModalOpen}
                        onClose={() => setIsAssetCurrencyModalOpen(false)}
                        currentCurrency={draft.costCurrency ?? "CNY"}
                        onSave={(currency) => patch("costCurrency", currency)}
                      />
                    </div>


  );
}
