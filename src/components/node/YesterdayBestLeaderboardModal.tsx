import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trophy, X, Search, Award, Activity, Radio, ShieldCheck, AlertCircle, HelpCircle } from "lucide-react";
import type { NodeInfo, YesterdayBestScope } from "@/types/komari";
import type { YesterdayLeaderboardItem } from "@/utils/yesterdayBestNode";
import { sortNodesByWeight } from "@/pages/ThemeManage/components/CarrierLossConfigModal";

export interface YesterdayBestLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: YesterdayLeaderboardItem[];
  allNodes: NodeInfo[];
  candidateUuids: string[];
  scope?: YesterdayBestScope;
  isMultiPingMode?: boolean;
  palette?: string;
}

export function YesterdayBestLeaderboardModal({
  isOpen,
  onClose,
  leaderboard,
  allNodes,
  candidateUuids,
  scope = "tri",
  isMultiPingMode = true,
  palette = "default",
}: YesterdayBestLeaderboardModalProps) {
  const [keyword, setKeyword] = useState("");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const isTriSingleBlocked = isMultiPingMode === false && scope === "tri";

  // 点击空白处关闭问号浮窗
  useEffect(() => {
    if (!isHelpOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isHelpOpen]);

  const scopeInfo = useMemo(() => {
    switch (scope) {
      case "ct":
        return {
          title: "电信稳定性排名",
          badge: "电信",
          desc: "近 24 小时仅统计电信线路质量，其他运营商已自动忽略",
          lossLabel: "电信丢包",
        };
      case "cu":
        return {
          title: "联通稳定性排名",
          badge: "联通",
          desc: "近 24 小时仅统计联通线路质量，其他运营商已自动忽略",
          lossLabel: "联通丢包",
        };
      case "cm":
        return {
          title: "移动稳定性排名",
          badge: "移动",
          desc: "近 24 小时仅统计移动线路质量，其他运营商已自动忽略",
          lossLabel: "移动丢包",
        };
      case "all":
        return {
          title: "全量线路评分",
          badge: "全量",
          desc: "全量线路评分仅反映节点自身的丢包程度",
          lossLabel: "综合丢包",
        };
      case "tri":
      default:
        return {
          title: "三网稳定性排名",
          badge: "三网",
          desc: "近 24 小时综合统计电信、联通、移动三网质量，三网齐备方可参评",
          lossLabel: "三网丢包",
        };
    }
  }, [scope]);

  const candidateSet = useMemo(() => new Set(candidateUuids), [candidateUuids]);
  const nodeByUuid = useMemo(() => new Map(allNodes.map((n) => [n.uuid, n])), [allNodes]);
  // 统一按权重升序对齐所有节点的基准排序
  const sortedAllNodes = useMemo(() => sortNodesByWeight(allNodes), [allNodes]);

  // 区分参与评分且有数据的列表与未参与列表
  const { participatingItems, excludedNodes } = useMemo(() => {
    const kw = keyword.trim().toLowerCase();

    // 1. 已参与并排名的列表
    let partList = leaderboard.map((item) => {
      const node = nodeByUuid.get(item.uuid);
      const name = node?.name?.trim() || item.name || item.uuid;
      const group = node?.group || "";
      const region = node?.region || "";
      const nodeIndex = sortedAllNodes.findIndex((n) => n.uuid === item.uuid);
      const nodeIndexText = nodeIndex >= 0 ? `#${nodeIndex + 1}` : "#--";
      return {
        ...item,
        name,
        group,
        region,
        nodeIndexText,
      };
    });

    if (kw) {
      partList = partList.filter(
        (i) =>
          i.name.toLowerCase().includes(kw) ||
          i.uuid.toLowerCase().includes(kw) ||
          i.nodeIndexText.toLowerCase().includes(kw) ||
          i.group.toLowerCase().includes(kw) ||
          i.region.toLowerCase().includes(kw),
      );
    }

    // 2. 被用户在设置中排除或暂无数据的节点
    const rankedUuids = new Set(leaderboard.map((i) => i.uuid));
    let exclList = sortNodesByWeight(sortedAllNodes.filter((n) => !candidateSet.has(n.uuid) || !rankedUuids.has(n.uuid)));

    if (kw) {
      exclList = exclList.filter((n) => {
        const name = (n.name || "").toLowerCase();
        const uuid = (n.uuid || "").toLowerCase();
        const group = (n.group || "").toLowerCase();
        return name.includes(kw) || uuid.includes(kw) || group.includes(kw);
      });
    }

    return { participatingItems: partList, excludedNodes: exclList };
  }, [leaderboard, sortedAllNodes, candidateSet, nodeByUuid, keyword]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="yesterday-leaderboard-modal-title"
      data-palette={palette}
      className="yesterday-leaderboard-modal fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 transition-opacity duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-2xl border border-(--hairline) bg-(--bg-card) shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-start justify-between gap-2.5 p-3 sm:p-4.5 border-b border-(--hairline) bg-(--surface-elev)/30">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Trophy size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3
                  id="yesterday-leaderboard-modal-title"
                  className="text-xs sm:text-sm font-semibold text-(--text-primary) shrink-0"
                >
                  {scopeInfo.title}
                </h3>
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 shrink-0">
                  {scopeInfo.badge}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-(--hairline) bg-(--bg-card) text-(--text-muted) shrink-0">
                  {isTriSingleBlocked ? "未启用多线模式" : `${participatingItems.length} 台参与`}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-(--text-muted) mt-0.5 leading-tight sm:leading-normal flex items-center flex-wrap gap-1">
                <span>
                  {isTriSingleBlocked
                    ? "当前处于单线测速模式，无法统计三大运营商数据"
                    : scopeInfo.desc}
                </span>
                {!isTriSingleBlocked && scope === "all" && (
                  <div
                    ref={helpRef}
                    className="relative inline-flex items-center"
                    onMouseEnter={() => setIsHelpOpen(true)}
                    onMouseLeave={() => setIsHelpOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsHelpOpen((prev) => !prev);
                      }}
                      className="p-0.5 -m-0.5 rounded-full text-(--text-muted) hover:text-(--text-primary) transition-colors cursor-pointer inline-flex items-center justify-center focus:outline-none"
                      aria-label="查看全量线路评分说明"
                    >
                      <HelpCircle size={13} className="shrink-0" />
                    </button>
                    {isHelpOpen && (
                      <div
                        className="absolute left-0 sm:left-1/2 -translate-x-4 sm:-translate-x-1/2 top-full mt-1.5 z-50 w-72 sm:w-80 p-3 rounded-xl border border-(--hairline) bg-(--bg-card) shadow-xl text-left select-text pointer-events-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-semibold text-xs text-(--text-primary) mb-1 flex items-center gap-1.5">
                          <HelpCircle size={13} className="text-amber-500 shrink-0" />
                          <span>为什么仅反映自身表现？</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-(--text-muted)">
                          各服务器在后台配置的测速线路可能完全不同（例如有的测同机房或同城线路，有的测跨洋跨国线路。考卷难度不同，分数无法横向比优劣。全量模式下该分值旨在客观呈现该服务器在其自身延迟测试线路下的实际丢包与网络品质。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-elev) transition-colors cursor-pointer shrink-0"
            title="关闭"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {isTriSingleBlocked ? (
          <div className="py-14 flex flex-col items-center justify-center text-center gap-3 px-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Radio size={22} />
            </div>
            <div className="text-sm font-semibold text-(--text-primary)">未启用多线模式</div>
            <p className="text-xs text-(--text-muted) max-w-sm leading-relaxed">
              三网稳定评分需在【网络延迟】中开启「多线模式」，或在稳定评分设置中切换为「全量」模式。
            </p>
          </div>
        ) : (
          <>
            {/* 搜索工具栏 */}
            <div className="p-2.5 sm:p-3 border-b border-(--hairline) bg-(--surface-elev)/10">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-(--text-muted)"
                />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜索服务器名称、序号或 UUID..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-(--hairline) bg-(--bg-card) text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent-500)"
                />
              </div>
            </div>

            {/* 榜单滚动列表 */}
            <div className="p-2.5 sm:p-4 overflow-y-auto space-y-2 flex-1 overscroll-contain">
              {participatingItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--text-muted)">
                  未找到符合条件的参评服务器
                </div>
              ) : (
                participatingItems.map((item) => {
              const isQualified = item.isQualified !== false;
              const isFirst = item.rank === 1 && isQualified;
              const isSecond = item.rank === 2 && isQualified;
              const isThird = item.rank === 3 && isQualified;

              const rankBadgeClass = !isQualified
                ? "bg-(--surface-elev) text-(--text-muted) border border-(--hairline) opacity-60"
                : isFirst
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-xs"
                  : isSecond
                    ? "bg-slate-300/15 text-slate-300 border border-slate-300/30 shadow-xs"
                    : isThird
                      ? "bg-amber-700/15 text-amber-600 border border-amber-700/30 shadow-xs"
                      : "bg-(--surface-elev) text-(--text-muted) border border-(--hairline)";

              const scoreTier = !isQualified
                ? "unqualified"
                : item.score >= 98
                  ? "pure"
                  : item.score >= 93
                    ? "good"
                    : item.score >= 85
                      ? "fine"
                      : item.score >= 70
                        ? "fair"
                        : item.score >= 55
                          ? "warn"
                          : "crit";

              const lossDisplayLabel = !isQualified
                ? `${item.taskCount && item.taskCount > 1 ? `${item.taskCount}线丢包` : "单线丢包"}`
                : scopeInfo.lossLabel;

              return (
                <div
                  key={item.uuid}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                    !isQualified
                      ? "border-(--hairline) bg-(--surface-elev)/10 opacity-75"
                      : isFirst
                        ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                        : "border-(--hairline) bg-(--surface-elev)/20 hover:bg-(--surface-elev)/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    {/* 左侧：排名徽章与服务器信息 */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${rankBadgeClass}`}
                      >
                        {item.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-(--text-primary)">
                            {item.nodeIndexText}
                          </span>
                          <span className="text-xs text-(--text-secondary) truncate font-medium">
                            {item.name}
                          </span>
                          {isFirst && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-black">
                              <Award size={10} /> 冠军
                            </span>
                          )}
                          {!isQualified && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500">
                              <AlertCircle size={9} />
                              {scope === "tri"
                                ? `未配齐三网 (缺${item.missingCarriers?.map((c) => (c === "ct" ? "电信" : c === "cu" ? "联通" : "移动")).join("、") || "部分线路"})`
                                : scope === "all"
                                  ? "暂无有效数据"
                                  : `未配${scope === "ct" ? "电信" : scope === "cu" ? "联通" : "移动"}线路`}
                            </span>
                          )}
                        </div>
                        {/* 方案 A：3 列自适应对齐网格，彻底消除折行与列错位 */}
                        <div className="grid grid-cols-3 gap-1 sm:gap-2 mt-1.5 text-[10px] text-(--text-muted) max-w-67.5 sm:max-w-85">
                          <div className="flex items-center gap-1 min-w-0">
                            <Radio size={11} className="text-sky-400 shrink-0" />
                            <span className="truncate">{lossDisplayLabel.replace("综合", "").replace("三网", "")}:</span>
                            <b className="text-(--text-secondary) font-mono shrink-0">{item.avgLoss}%</b>
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <Activity size={11} className="text-emerald-400 shrink-0" />
                            <span className="shrink-0">CV:</span>
                            <b className="text-(--text-secondary) font-mono shrink-0">{item.cv}</b>
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <ShieldCheck size={11} className="text-purple-400 shrink-0" />
                            <span className="shrink-0">尖峰:</span>
                            <b className="text-(--text-secondary) font-mono shrink-0">{item.spikeRatio}</b>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 右侧：得分大字 */}
                    <div className="text-right shrink-0">
                      {!isQualified && (
                        <div className="text-[8px] font-medium text-amber-500/80 -mb-0.5 tracking-tight">
                          {scope === "tri" ? "未配齐三网" : scope === "all" ? "暂无数据" : "未配该线路"}
                        </div>
                      )}
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span
                          className="yesterday-leaderboard-score-val text-lg font-black italic tracking-tight"
                          data-tier={scoreTier}
                        >
                          {item.score}
                        </span>
                        <span
                          className="yesterday-leaderboard-score-unit text-[9px] font-black italic opacity-80"
                          data-tier={scoreTier}
                        >
                          PTS
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* 未参与评分的节点折叠区 */}
          {excludedNodes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-(--hairline)">
              <div className="text-[11px] font-semibold text-(--text-muted) mb-2">
                未参与排名的服务器 ({excludedNodes.length} 台)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {excludedNodes.map((n) => {
                  const nodeIndex = sortedAllNodes.findIndex((x) => x.uuid === n.uuid);
                  const nodeIndexText = nodeIndex >= 0 ? `#${nodeIndex + 1}` : "#--";
                  return (
                    <div
                      key={n.uuid}
                      className="p-1.5 px-2 rounded-lg border border-(--hairline) bg-(--surface-elev)/10 flex items-center justify-between text-[11px] text-(--text-muted)"
                    >
                      <span className="truncate">
                        <b className="text-(--text-muted) mr-1">{nodeIndexText}</b>
                        {n.name?.trim() || n.uuid}
                      </span>
                      <span className="text-[10px] shrink-0 text-(--text-muted)/80">未勾选/无数据</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </>
    )}
  </div>
</div>,
document.body,
);
}
