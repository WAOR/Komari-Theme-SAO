import { useState, useMemo, useEffect, useRef } from "react";
import { Search, X, Check, RotateCcw, Sliders, Server, Filter } from "lucide-react";
import type { NodeInfo, YesterdayBestScope, YesterdayBestDisplayMode } from "@/types/komari";
import { sortHomeGroupOptions } from "@/utils/homeNodes";

export function sortNodesByWeight(nodes: readonly NodeInfo[]): NodeInfo[] {
  return [...nodes].sort((left, right) => {
    const leftWeight = Number(left.weight) || 0;
    const rightWeight = Number(right.weight) || 0;
    if (leftWeight !== rightWeight) return leftWeight - rightWeight;
    const nameCmp = (left.name || "").localeCompare(right.name || "", "zh-CN");
    if (nameCmp !== 0) return nameCmp;
    return (left.uuid || "").localeCompare(right.uuid || "");
  });
}

export interface CarrierLossConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  allNodes: NodeInfo[];
  includedNodeUuids: string[];
  groupOrder?: string[];
  title?: string;
  description?: string;
  onSave: (includedUuids: string[], scope?: YesterdayBestScope, displayMode?: YesterdayBestDisplayMode) => void;
  showScopeSelector?: boolean;
  scope?: YesterdayBestScope;
  displayMode?: YesterdayBestDisplayMode;
}

export function CarrierLossConfigModal({
  isOpen,
  onClose,
  allNodes,
  includedNodeUuids,
  groupOrder,
  title = "三网丢包卡片设置",
  description = "勾选参与统计计算的服务器，排除无关机器避免污染大盘指标。",
  onSave,
  showScopeSelector = false,
  scope = "tri",
  displayMode = "best",
}: CarrierLossConfigModalProps) {
  // 内部维护一个选中的 UUID 集合
  // 语义约定：若数组为空，表示“全部参与统计”
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(() => {
    if (!includedNodeUuids || includedNodeUuids.length === 0) {
      return new Set(allNodes.map((n) => n.uuid));
    }
    return new Set(includedNodeUuids);
  });

  const [selectedScope, setSelectedScope] = useState<YesterdayBestScope>(scope || "tri");
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<YesterdayBestDisplayMode>(displayMode || "best");
  const [keyword, setKeyword] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("__all__");

  // 严格按后台 weight 权重升序排列节点，权重相同时按节点名称升序
  const sortedNodes = useMemo(() => {
    return sortNodesByWeight(allNodes);
  }, [allNodes]);

  // 仅在弹窗从"关闭"→"打开"的瞬间同步外部状态一次；
  // 弹窗打开期间绝不因父组件 re-render 或 props 变化覆写用户的勾选操作。
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = !wasOpenRef.current && isOpen;
    wasOpenRef.current = isOpen;
    if (justOpened) {
      if (!includedNodeUuids || includedNodeUuids.length === 0) {
        setSelectedUuids(new Set(allNodes.map((n) => n.uuid)));
      } else {
        setSelectedUuids(new Set(includedNodeUuids));
      }
      setKeyword("");
      setSelectedGroup("__all__");
      setSelectedScope(scope || "tri");
      setSelectedDisplayMode(displayMode || "best");
    }
  }, [isOpen, includedNodeUuids, allNodes, scope, displayMode]);

  // ESC 键关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 提取可用分组并按后台分组顺序排列
  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const node of sortedNodes) {
      const g = (node.group || "").trim();
      if (g) set.add(g);
    }
    const rawGroups = Array.from(set);
    if (groupOrder && groupOrder.length > 0) {
      return sortHomeGroupOptions(rawGroups, groupOrder);
    }
    return rawGroups.sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [sortedNodes, groupOrder]);

  // 搜索和分组过滤 (基于已按 weight 升序排序的列表)
  const filteredNodes = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return sortedNodes.filter((node) => {
      // 分组过滤
      if (selectedGroup !== "__all__") {
        const nodeGroup = (node.group || "").trim();
        if (nodeGroup !== selectedGroup) return false;
      }
      // 关键字搜索 (匹配名称、UUID、分组)
      if (kw) {
        const name = (node.name || "").toLowerCase();
        const uuid = (node.uuid || "").toLowerCase();
        const group = (node.group || "").toLowerCase();
        if (!name.includes(kw) && !uuid.includes(kw) && !group.includes(kw)) {
          return false;
        }
      }
      return true;
    });
  }, [sortedNodes, keyword, selectedGroup]);

  // 切换单个节点勾选
  const toggleNode = (uuid: string) => {
    setSelectedUuids((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  };

  // 全选当前过滤结果
  const selectAllFiltered = () => {
    setSelectedUuids((prev) => {
      const next = new Set(prev);
      for (const n of filteredNodes) {
        next.add(n.uuid);
      }
      return next;
    });
  };

  // 全不选当前过滤结果
  const deselectAllFiltered = () => {
    setSelectedUuids((prev) => {
      const next = new Set(prev);
      for (const n of filteredNodes) {
        next.delete(n.uuid);
      }
      return next;
    });
  };

  // 重置为默认（全部参与）
  const handleResetToAll = () => {
    setSelectedUuids(new Set(allNodes.map((n) => n.uuid)));
  };

  // 提交保存
  const handleConfirm = () => {
    if (selectedUuids.size === 0) return;
    const finalUuids = selectedUuids.size === allNodes.length ? [] : Array.from(selectedUuids);
    onSave(
      finalUuids,
      showScopeSelector ? selectedScope : undefined,
      showScopeSelector ? selectedDisplayMode : undefined,
    );
    onClose();
  };

  if (!isOpen) return null;

  const isAllSelected = selectedUuids.size === allNodes.length;
  const hasSelection = selectedUuids.size > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="carrier-loss-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl h-[88vh] max-h-[88vh] sm:h-auto sm:max-h-[88vh] flex flex-col rounded-2xl border border-(--hairline) bg-(--bg-card) shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-start justify-between gap-2.5 p-3 sm:p-4.5 border-b border-(--hairline) bg-(--surface-elev)/30">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-(--accent-500)/10 border border-(--accent-500)/30 flex items-center justify-center text-(--accent-500) shrink-0">
              <Sliders size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3
                  id="carrier-loss-modal-title"
                  className="text-xs sm:text-sm font-semibold text-(--text-primary) shrink-0"
                >
                  {title}
                </h3>
                {isAllSelected ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500) shrink-0">
                    全部参与
                  </span>
                ) : !hasSelection ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-rose-500/30 bg-rose-500/10 text-rose-500 shrink-0">
                    未选择服务器
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-500 shrink-0">
                    已选 {selectedUuids.size}/{allNodes.length} 台
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-(--text-muted) mt-0.5 leading-tight sm:leading-normal">
                {description}
              </p>
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

        {/* 昨日最佳：评分线路与展现指标配置 */}
        {showScopeSelector && (
          <div className="p-2.5 sm:p-3 border-b border-(--hairline) bg-(--surface-elev)/20 space-y-2 shrink-0">
            {/* 1. 评分线路：移动端一行自适应 5 列单选胶囊 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                  <span>🎯 评分线路</span>
                </span>
                <span className="text-[10px] text-(--accent-500) font-medium">
                  {selectedScope === "tri" && "三网齐备才参评"}
                  {selectedScope === "ct" && "仅按电信线路"}
                  {selectedScope === "cu" && "仅按联通线路"}
                  {selectedScope === "cm" && "仅按移动线路"}
                  {selectedScope === "all" && "按全部线路"}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {[
                  { id: "tri", label: "三网" },
                  { id: "ct", label: "电信" },
                  { id: "cu", label: "联通" },
                  { id: "cm", label: "移动" },
                  { id: "all", label: "全量" },
                ].map((item) => {
                  const isSelected = selectedScope === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedScope(item.id as YesterdayBestScope)}
                      className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? "bg-(--accent-500) border-(--accent-500) text-white font-semibold shadow-xs"
                          : "border-(--hairline) bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--hairline)/80 text-xs"
                      }`}
                    >
                      <span className="text-xs leading-none tracking-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. 首页卡片展现指标：紧凑并排 */}
            <div className="pt-1.5 border-t border-(--hairline)/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                  <span>📊 卡片展现指标</span>
                </span>
                <span className="text-[10px] text-(--text-muted)">
                  {selectedDisplayMode === "best" ? "突出标杆机器" : "反映大盘均值"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {[
                  {
                    id: "best",
                    label: "最高分机器",
                    tag: "标杆",
                  },
                  {
                    id: "average",
                    label: "集群平均分",
                    tag: "大盘",
                  },
                ].map((modeItem) => {
                  const isModeSelected = selectedDisplayMode === modeItem.id;
                  return (
                    <button
                      key={modeItem.id}
                      type="button"
                      onClick={() => setSelectedDisplayMode(modeItem.id as YesterdayBestDisplayMode)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                        isModeSelected
                          ? "bg-(--accent-500)/10 border-(--accent-500) text-(--accent-500) ring-1 ring-(--accent-500)/30 font-semibold"
                          : "border-(--hairline) bg-(--bg-card) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--hairline)/80"
                      }`}
                    >
                      <span className="text-xs tracking-tight">
                        {modeItem.label}
                      </span>
                      <span className={`text-[9.5px] px-1 py-0.2 rounded leading-none ${
                        isModeSelected ? "bg-(--accent-500)/20 text-(--accent-500)" : "bg-(--surface-elev) text-(--text-muted)"
                      }`}>
                        {modeItem.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 快捷过滤工具栏（搜索 + 分组 + 全选/全不选） */}
        <div className="p-2.5 sm:p-4 border-b border-(--hairline) bg-(--surface-elev)/10 space-y-2 sm:space-y-2.5">
          {/* 搜索框 */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-(--text-muted)"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索服务器名称、UUID、分组..."
              className="w-full h-7.5 sm:h-8 pl-8 pr-7.5 sm:pl-8.5 sm:pr-8 text-xs rounded-lg border border-(--hairline) bg-(--bg-card) text-(--text-primary) placeholder:text-(--text-muted)/70 focus:outline-hidden focus:border-(--accent-500) transition-all"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-(--text-muted) hover:text-(--text-primary)"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* 分组筛选标签胶囊 */}
          {groups.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] custom-scrollbar">
              <span className="text-[10px] text-(--text-muted) shrink-0 flex items-center gap-1">
                <Filter size={10} /> 分组:
              </span>
              <button
                type="button"
                onClick={() => setSelectedGroup("__all__")}
                className={`px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap transition-all cursor-pointer ${
                  selectedGroup === "__all__"
                    ? "bg-(--accent-500) text-white border-(--accent-500)"
                    : "border-(--hairline) bg-(--bg-card) text-(--text-muted) hover:text-(--text-primary)"
                }`}
              >
                全部 ({allNodes.length})
              </button>
              {groups.map((group) => {
                const count = allNodes.filter((n) => (n.group || "").trim() === group).length;
                const isCurrent = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`px-2 py-0.5 rounded-full border text-[10px] whitespace-nowrap transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-(--accent-500) text-white border-(--accent-500)"
                        : "border-(--hairline) bg-(--bg-card) text-(--text-muted) hover:text-(--text-primary)"
                    }`}
                  >
                    {group} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* 快捷批量勾选条 */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-(--hairline)/60">
            <span className="text-(--text-muted)">
              当前列表: <strong className="text-(--text-primary)">{filteredNodes.length}</strong> 台
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-[10px] sm:text-[11px] text-(--accent-500) hover:underline cursor-pointer"
              >
                全选当前
              </button>
              <span className="text-(--hairline)">|</span>
              <button
                type="button"
                onClick={deselectAllFiltered}
                className="text-[10px] sm:text-[11px] text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
              >
                全不选
              </button>
            </div>
          </div>
        </div>

        {/* 服务器节点勾选列表 */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 sm:space-y-1.5 custom-scrollbar min-h-0">
          {filteredNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-(--text-muted)">
              <Server size={24} className="opacity-40 mb-2" />
              <p className="text-xs">未找到符合条件的服务器</p>
            </div>
          ) : (
            filteredNodes.map((node) => {
              const isChecked = selectedUuids.has(node.uuid);
              return (
                <div
                  key={node.uuid}
                  onClick={() => toggleNode(node.uuid)}
                  className={`flex items-center justify-between gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "border-(--accent-500)/40 bg-(--accent-500)/8 text-(--text-primary)"
                      : "border-(--hairline) bg-(--bg-card)/60 hover:bg-(--surface-elev)/50 text-(--text-secondary)"
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? "bg-(--accent-500) border-(--accent-500) text-white"
                          : "border-(--hairline) bg-(--bg-card)"
                      }`}
                    >
                      {isChecked && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium flex items-center gap-1 sm:gap-1.5 min-w-0">
                        <span className="truncate">{node.name || "未命名节点"}</span>
                        {node.group && (
                          <span className="text-[9px] sm:text-[10px] font-normal px-1 sm:px-1.5 py-0.2 rounded border border-(--hairline) bg-(--bg-card)/80 text-(--text-muted) shrink-0 max-w-24 truncate">
                            {node.group}
                          </span>
                        )}
                        {node.region && (
                          <span className="text-[9px] sm:text-[10px] font-mono text-(--text-muted) shrink-0">
                            [{node.region.toUpperCase()}]
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono text-(--text-muted)/70 truncate">
                        {node.uuid}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0 font-medium">
                    {isChecked ? (
                      <span className="text-(--accent-500)">参与</span>
                    ) : (
                      <span className="text-(--text-muted)">排除</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* 当全不选时，单起一行醒目横条提示，绝不挤占底部按钮 */}
        {!hasSelection && (
          <div className="px-3 sm:px-4 py-1.5 bg-rose-500/10 border-t border-rose-500/20 flex items-center justify-center gap-1.5 text-rose-500 text-[11px] font-medium text-center animate-in fade-in">
            <span>⚠️ 请至少勾选 1 台服务器参与三网丢包统计</span>
          </div>
        )}

        {/* 底部按钮栏 */}
        <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3.5 border-t border-(--hairline) bg-(--surface-elev)/20">
          <button
            type="button"
            onClick={handleResetToAll}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-elev) transition-all cursor-pointer shrink-0"
            title="一键恢复所有节点全部参与统计"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">恢复全部参与</span>
            <span className="sm:hidden">恢复全部</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-3.5 py-1.5 rounded-lg border border-(--hairline) text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--surface-elev) transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!hasSelection}
              onClick={handleConfirm}
              className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                hasSelection
                  ? "bg-(--accent-500) text-white hover:opacity-90 active:scale-98 cursor-pointer"
                  : "border border-(--hairline) bg-(--surface-elev)/40 text-(--text-muted) opacity-50 cursor-not-allowed"
              }`}
              title={hasSelection ? "保存参与三网丢包计算的服务器" : "请至少勾选一台服务器参与统计"}
            >
              确定保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

