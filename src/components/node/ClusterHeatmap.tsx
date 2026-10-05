import { useState, useRef, useMemo, useEffect } from "react";
import { Flag } from "@/components/ui/Flag";
import { formatByteRateLabel } from "@/utils/format";
import {
  GRID_COLUMNS,
  MIN_RACK_ROWS,
  DEFAULT_PATTERN_SET,
  getPatternPixelSet,
} from "@/utils/matrixPatterns";
import type { HomeNodeSummary } from "@/services/wsStore";

export const SAO_PIXEL_INDICES = DEFAULT_PATTERN_SET;

interface ClusterHeatmapProps {
  nodes: HomeNodeSummary[];
  nameByUuid?: Map<string, string>;
  onlinePct: number;
  onlineNodes: number;
  offlineNodes: number;
  totalNodes: number;
  colorTheme?: "default" | "eva";
  mockFill?: boolean;
  bootAnimation?: boolean;
  customPattern?: number[] | null;
}

interface MockSlot {
  slotNumber: number;
  status: "idle" | "active";
  netUp: number;
  netDown: number;
  cpuPct: number;
  ramPct: number;
}

interface HoverState {
  node?: HomeNodeSummary;
  name: string;
  x: number;
  y: number;
  placement: "top" | "bottom";
  isEmpty?: boolean;
  slotIndex?: number;
  isMock?: boolean;
  mockSlot?: MockSlot;
}

// 网络吞吐阶梯定义（以字节每秒 B/s 为基准）：
// - 空闲待机 (idle): max(netUp, netDown) < 500 KB/s
// - 活跃传输 (active): 500 KB/s ~ 5 MB/s
// - 高吞吐 (high): >= 5 MB/s
export const THROUGHPUT_ACTIVE_BYTES = 500 * 1024; // 500 KB/s
export const THROUGHPUT_HIGH_BYTES = 5 * 1024 * 1024; // 5 MB/s

export type NodeThroughputStatus = "offline" | "unknown" | "high" | "active" | "idle";

export function resolveNodeThroughputStatus(node: HomeNodeSummary): {
  status: NodeThroughputStatus;
  statusClass: string;
  badgeText: string;
  badgeClass: string;
} {
  if (node.online === false) {
    return {
      status: "offline",
      statusClass: "is-offline",
      badgeText: "离线",
      badgeClass: "is-offline",
    };
  }
  if (node.online == null) {
    return {
      status: "unknown",
      statusClass: "is-unknown",
      badgeText: "未知",
      badgeClass: "is-unknown",
    };
  }

  const maxRate = Math.max(node.netUp ?? 0, node.netDown ?? 0);
  if (maxRate >= THROUGHPUT_HIGH_BYTES) {
    return {
      status: "high",
      statusClass: "is-high-load",
      badgeText: "高吞吐",
      badgeClass: "is-warning",
    };
  }
  if (maxRate >= THROUGHPUT_ACTIVE_BYTES) {
    return {
      status: "active",
      statusClass: "is-medium-load",
      badgeText: "活跃传输",
      badgeClass: "is-active",
    };
  }
  return {
    status: "idle",
    statusClass: "is-low-load",
    badgeText: "空闲待机",
    badgeClass: "is-idle",
  };
}

export function ClusterHeatmap({
  nodes,
  nameByUuid,
  onlinePct,
  onlineNodes,
  offlineNodes,
  totalNodes,
  colorTheme = "default",
  mockFill = false,
  bootAnimation = true,
  customPattern = null,
}: ClusterHeatmapProps) {
  const [hoverInfo, setHoverInfo] = useState<HoverState | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const litPixelSet = useMemo(() => {
    return getPatternPixelSet(customPattern);
  }, [customPattern]);

  // 开屏横扫点阵动效状态机
  const [bootPhase, setBootPhase] = useState<"idle" | "scan" | "hold" | "dissolve">(() =>
    bootAnimation ? "scan" : "idle",
  );
  const [scanCol, setScanCol] = useState<number>(-1);

  useEffect(() => {
    if (!bootAnimation) {
      setBootPhase("idle");
      return;
    }
    // 页面载入时从左向右横扫点亮正体 "SAO" 字符点阵，呼吸三下后平滑过渡至真实节点数据
    setBootPhase("scan");
    setScanCol(-1);

    let interval: ReturnType<typeof setInterval> | null = null;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    let dissolveTimer: ReturnType<typeof setTimeout> | null = null;

    // 首屏渲染与节点 DOM 水合需要数个微任务周期（约 120-180ms）。
    // 给予 180ms 的优雅缓冲期，使机架暗色底板先完整就位，
    // 避开首屏挂载时的主线程微卡顿，确保激光扫光从第 0 列开始以恒定 24ms 匀速扫过，根除第一排由于主线程阻塞而悬停发光闪烁的异常。
    const startDelayTimer = setTimeout(() => {
      let current = 0;
      interval = setInterval(() => {
        setScanCol(current);
        current++;
        if (current > GRID_COLUMNS) {
          if (interval) clearInterval(interval);
          setBootPhase("hold");
          // 呼吸三下（每次 600ms，共 1800ms）后进入平滑溶解阶段
          holdTimer = setTimeout(() => {
            setBootPhase("dissolve");
            dissolveTimer = setTimeout(() => {
              setBootPhase("idle");
            }, 350);
          }, 1800);
        }
      }, 24);
    }, 180);

    return () => {
      clearTimeout(startDelayTimer);
      if (interval) clearInterval(interval);
      if (holdTimer) clearTimeout(holdTimer);
      if (dissolveTimer) clearTimeout(dissolveTimer);
    };
  }, [bootAnimation]);

  // 统计高吞吐节点数量（速率 >= 5 MB/s）
  const highThroughputCount = useMemo(() => {
    let count = 0;
    for (const node of nodes) {
      if (node.online === true) {
        const maxRate = Math.max(node.netUp ?? 0, node.netDown ?? 0);
        if (maxRate >= THROUGHPUT_HIGH_BYTES) {
          count++;
        }
      }
    }
    return count;
  }, [nodes]);

  // 计算填满整矩形所需的行数与空槽数（保证无缺角，且最少铺满 5 行 100 槽对齐带宽高度）
  const { totalSlots, emptySlotsCount } = useMemo(() => {
    const rows = Math.max(MIN_RACK_ROWS, Math.ceil(Math.max(nodes.length, 1) / GRID_COLUMNS));
    const total = rows * GRID_COLUMNS;
    return {
      totalSlots: total,
      emptySlotsCount: Math.max(0, total - nodes.length),
    };
  }, [nodes.length]);

  // 当开启 mockFill 时，为每个空闲槽位随机生成比例可变的「空闲待机」与「活跃传输」模拟数据
  // 随着页面刷新，Math.random() 产生新的分布与比例；在单次渲染周期中保持稳定
  const mockSlots: MockSlot[] = useMemo(() => {
    if (!mockFill || emptySlotsCount <= 0) return [];
    // 随机活跃比例：20% ~ 55%
    const activeProbability = 0.2 + Math.random() * 0.35;
    return Array.from({ length: emptySlotsCount }, (_, i) => {
      const slotNumber = nodes.length + i + 1;
      const isActive = Math.random() < activeProbability;
      if (isActive) {
        return {
          slotNumber,
          status: "active" as const,
          netUp: Math.round(600_000 + Math.random() * 2_000_000),
          netDown: Math.round(800_000 + Math.random() * 3_500_000),
          cpuPct: Math.round(15 + Math.random() * 45),
          ramPct: Math.round(35 + Math.random() * 50),
        };
      }
      return {
        slotNumber,
        status: "idle" as const,
        netUp: Math.round(5_000 + Math.random() * 250_000),
        netDown: Math.round(15_000 + Math.random() * 450_000),
        cpuPct: Math.round(1 + Math.random() * 15),
        ramPct: Math.round(15 + Math.random() * 40),
      };
    });
  }, [mockFill, emptySlotsCount, nodes.length]);

  // 根据单元格一维序号返回开屏动画样式类
  const getBootAnimationClass = (cellIndex: number): string => {
    if (bootPhase === "idle") return "";
    if (cellIndex >= 100) return "is-sao-unlit";
    const col = cellIndex % GRID_COLUMNS;
    const isLit = litPixelSet.has(cellIndex);

    if (bootPhase === "scan") {
      if (col === scanCol) return "is-sao-beam";
      if (col < scanCol) return isLit ? "is-sao-pixel" : "is-sao-bg";
      return "is-sao-unlit";
    }
    if (bootPhase === "hold") {
      return isLit ? "is-sao-pixel is-sao-glow" : "is-sao-bg";
    }
    if (bootPhase === "dissolve") {
      return "is-sao-dissolve";
    }
    return "";
  };

  const lastTouchTimeRef = useRef<number>(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [tooltipTrigger, setTooltipTrigger] = useState<"mouse" | "touch">("mouse");

  // 点击外部区域时自动关闭当前展开的移动端悬浮卡
  useEffect(() => {
    if (!activeKey) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (wrapRef.current && target && !wrapRef.current.contains(target)) {
        setActiveKey(null);
        setHoverInfo(null);
      }
    };
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [activeKey]);

  const calcTooltipCoords = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const wrapRect = wrapRef.current?.getBoundingClientRect();
    if (!wrapRect) return null;

    const rawX = rect.left - wrapRect.left + rect.width / 2;
    const clampedX = Math.max(115, Math.min(wrapRect.width - 115, rawX));
    const cellTopInWrap = rect.top - wrapRect.top;
    const isNearTop = cellTopInWrap < 42;
    const placement: "top" | "bottom" = isNearTop ? "bottom" : "top";
    const y = isNearTop ? rect.bottom - wrapRect.top + 6 : rect.top - wrapRect.top - 6;

    return { x: clampedX, y, placement };
  };

  const showNodeTooltip = (target: HTMLElement, node: HomeNodeSummary) => {
    const coords = calcTooltipCoords(target);
    if (!coords) return;
    setHoverInfo({
      node,
      name: nameByUuid?.get(node.uuid) || node.uuid,
      x: coords.x,
      y: coords.y,
      placement: coords.placement,
    });
  };

  const showMockSlotTooltip = (target: HTMLElement, slot: MockSlot) => {
    const coords = calcTooltipCoords(target);
    if (!coords) return;
    setHoverInfo({
      name: `机位插槽 #${slot.slotNumber}`,
      x: coords.x,
      y: coords.y,
      placement: coords.placement,
      isMock: true,
      mockSlot: slot,
    });
  };

  const showEmptySlotTooltip = (target: HTMLElement, slotIndex: number) => {
    const coords = calcTooltipCoords(target);
    if (!coords) return;
    setHoverInfo({
      name: `机位插槽 #${slotIndex}`,
      x: coords.x,
      y: coords.y,
      placement: coords.placement,
      isEmpty: true,
      slotIndex,
    });
  };

  const scrollToNodeCard = (uuid: string) => {
    const el = document.getElementById(`node-card-${uuid}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("is-highlight-target");
      window.setTimeout(() => {
        el.classList.remove("is-highlight-target");
      }, 2000);
    }
  };

  const handleCellClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    node: HomeNodeSummary,
  ) => {
    const key = `node-${node.uuid}`;
    const isTouchInteraction =
      Date.now() - lastTouchTimeRef.current < 800 ||
      (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches);

    if (isTouchInteraction) {
      setTooltipTrigger("touch");
      // 移动端：若当前尚未展示该方块的悬浮卡，第一次点击先展开悬浮卡
      if (activeKey !== key) {
        setActiveKey(key);
        showNodeTooltip(e.currentTarget, node);
        return;
      }
      // 移动端：已处于展示状态下再次点击相同方块，跳转直达对应卡片
      scrollToNodeCard(node.uuid);
      setActiveKey(null);
      setHoverInfo(null);
      return;
    }

    // 桌面端（带 hover 的鼠标操作）：点击直接直达
    scrollToNodeCard(node.uuid);
  };

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    node: HomeNodeSummary,
  ) => {
    // 忽略移动端轻触所合成触发的 mouseenter
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    setTooltipTrigger("mouse");
    showNodeTooltip(e.currentTarget, node);
    setActiveKey(`node-${node.uuid}`);
  };

  const handleMockSlotMouseEnter = (
    e: React.MouseEvent<HTMLButtonElement>,
    slot: MockSlot,
  ) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    setTooltipTrigger("mouse");
    showMockSlotTooltip(e.currentTarget, slot);
    setActiveKey(`mock-${slot.slotNumber}`);
  };

  const handleMockSlotClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    slot: MockSlot,
  ) => {
    const key = `mock-${slot.slotNumber}`;
    const isTouchInteraction =
      Date.now() - lastTouchTimeRef.current < 800 ||
      (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches);

    if (isTouchInteraction) {
      setTooltipTrigger("touch");
      if (activeKey === key) {
        setActiveKey(null);
        setHoverInfo(null);
      } else {
        setActiveKey(key);
        showMockSlotTooltip(e.currentTarget, slot);
      }
    }
  };

  const handleEmptySlotMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    setTooltipTrigger("mouse");
    showEmptySlotTooltip(e.currentTarget, slotIndex);
    setActiveKey(`empty-${slotIndex}`);
  };

  const handleEmptySlotClick = (
    e: React.MouseEvent<HTMLDivElement>,
    slotIndex: number,
  ) => {
    const key = `empty-${slotIndex}`;
    const isTouchInteraction =
      Date.now() - lastTouchTimeRef.current < 800 ||
      (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches);

    if (isTouchInteraction) {
      setTooltipTrigger("touch");
      if (activeKey === key) {
        setActiveKey(null);
        setHoverInfo(null);
      } else {
        setActiveKey(key);
        showEmptySlotTooltip(e.currentTarget, slotIndex);
      }
    }
  };

  const handleCellMouseLeave = () => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    setHoverInfo(null);
    setActiveKey(null);
  };

  const isBooting = bootPhase !== "idle" && bootPhase !== "dissolve";

  const isScrollable = totalSlots > 100;

  return (
    <div
      className="mao-progress-section mao-matrix-section"
      data-palette={colorTheme === "eva" ? "eva" : "default"}
    >
      <div className="mao-progress-section-header">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="mao-progress-big-num">{onlinePct.toFixed(0)}%</span>
          <span className="mao-progress-unit-label">在线率</span>
        </div>
        <div className="flex items-center gap-2">
          {highThroughputCount > 0 && (
            <div className="mao-progress-tag-box text-right">
              <span className="mao-progress-tag-label text-(--status-warning)">高吞吐</span>
              <span className="mao-progress-tag-val">{highThroughputCount} 台</span>
            </div>
          )}
          <div className="mao-progress-tag-box text-right">
            <span className="mao-progress-tag-label">离线服务器</span>
            <span className="mao-progress-tag-val">{offlineNodes} 台</span>
          </div>
        </div>
      </div>

      {/* GitHub 风格的规整机架方块矩阵（<= 100 台固定无滚动，> 100 台平滑无痕滚动） */}
      <div
        ref={wrapRef}
        className={`mao-heatmap-wrap${bootPhase !== "idle" ? " is-booting" : ""}${isScrollable ? " is-scrollable" : ""}`}
        onTouchStartCapture={() => {
          lastTouchTimeRef.current = Date.now();
        }}
      >
        <div
          className={`mao-heatmap-grid${bootPhase !== "idle" ? " is-booting" : ""}${isScrollable ? " is-scrollable" : ""}`}
          role="grid"
          aria-label="服务器集群机架热力矩阵"
        >
          {/* 已接入的真实节点 */}
          {nodes.map((node, idx) => {
            const { statusClass, badgeText } = resolveNodeThroughputStatus(node);
            const nodeName = nameByUuid?.get(node.uuid) || node.uuid;
            const bootClass = getBootAnimationClass(idx);
            const isActive = activeKey === `node-${node.uuid}`;

            return (
              <button
                key={node.uuid}
                type="button"
                className={`mao-heatmap-cell ${statusClass} ${bootClass}${isActive ? " is-active" : ""}`}
                onClick={(e) => !isBooting && handleCellClick(e, node)}
                onMouseEnter={(e) => !isBooting && handleCellMouseEnter(e, node)}
                onMouseLeave={handleCellMouseLeave}
                aria-label={`${nodeName}: ${badgeText}`}
              />
            );
          })}

          {/* 空余机位插槽（保证填满整行、且最少铺满 5 行 100 槽） */}
          {mockFill
            ? mockSlots.map((slot, i) => {
                const idx = nodes.length + i;
                const statusClass =
                  slot.status === "active" ? "is-medium-load" : "is-low-load";
                const badgeText = slot.status === "active" ? "活跃传输" : "空闲待机";
                const bootClass = getBootAnimationClass(idx);
                const isActive = activeKey === `mock-${slot.slotNumber}`;

                return (
                  <button
                    key={`mock-slot-${slot.slotNumber}`}
                    type="button"
                    className={`mao-heatmap-cell ${statusClass} is-mock-cell ${bootClass}${isActive ? " is-active" : ""}`}
                    onClick={(e) => !isBooting && handleMockSlotClick(e, slot)}
                    onMouseEnter={(e) => !isBooting && handleMockSlotMouseEnter(e, slot)}
                    onMouseLeave={handleCellMouseLeave}
                    aria-label={`机架模拟槽位 #${slot.slotNumber}: ${badgeText}`}
                  />
                );
              })
            : Array.from({ length: emptySlotsCount }, (_, i) => {
                const idx = nodes.length + i;
                const slotNumber = nodes.length + i + 1;
                const bootClass = getBootAnimationClass(idx);
                const isActive = activeKey === `empty-${slotNumber}`;

                return (
                  <div
                    key={`empty-slot-${i}`}
                    className={`mao-heatmap-cell is-empty-slot ${bootClass}${isActive ? " is-active" : ""}`}
                    onClick={(e) => !isBooting && handleEmptySlotClick(e, slotNumber)}
                    onMouseEnter={(e) => !isBooting && handleEmptySlotMouseEnter(e, slotNumber)}
                    onMouseLeave={handleCellMouseLeave}
                    aria-label={`机架空槽 #${slotNumber}`}
                  />
                );
              })}
        </div>

        {/* 悬停浮层 Tooltip */}
        {hoverInfo && !isBooting && (
          <div
            className={`mao-heatmap-tooltip is-${hoverInfo.placement}`}
            style={{
              left: `${hoverInfo.x}px`,
              top: `${hoverInfo.y}px`,
            }}
          >
            {hoverInfo.isMock && hoverInfo.mockSlot ? (
              <>
                <div className="mao-tooltip-header">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                      模拟机位
                    </span>
                    <span className="mao-tooltip-name">{hoverInfo.name}</span>
                  </div>
                  <span
                    className={`mao-tooltip-status ${
                      hoverInfo.mockSlot.status === "active" ? "is-active" : "is-idle"
                    }`}
                  >
                    {hoverInfo.mockSlot.status === "active" ? "活跃传输" : "空闲待机"}
                  </span>
                </div>

                <div className="mao-tooltip-stats">
                  <div className="mao-tooltip-stat-item">
                    <span className="label">CPU</span>
                    <span className="val">{hoverInfo.mockSlot.cpuPct}%</span>
                  </div>
                  <div className="mao-tooltip-stat-item">
                    <span className="label">内存</span>
                    <span className="val">{hoverInfo.mockSlot.ramPct}%</span>
                  </div>
                  <div className="mao-tooltip-stat-item">
                    <span className="label">实时带宽</span>
                    <span className="val">
                      ↑ {formatByteRateLabel(hoverInfo.mockSlot.netUp)} · ↓{" "}
                      {formatByteRateLabel(hoverInfo.mockSlot.netDown)}
                    </span>
                  </div>
                </div>
                <div className="mao-tooltip-tip text-(--text-tertiary)">
                  <span>模拟数据填充展示 · 待接入实际服务器</span>
                </div>
              </>
            ) : hoverInfo.isEmpty ? (
              <div className="mao-tooltip-empty-content">
                <span className="font-semibold">{hoverInfo.name}</span>
                <span className="text-[10px] text-(--text-muted) block mt-0.5">
                  空置机位 · 待接入服务器
                </span>
              </div>
            ) : (
              <>
                <div className="mao-tooltip-header">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {hoverInfo.node && <Flag region={hoverInfo.node.region} size={13} />}
                    <span className="mao-tooltip-name">{hoverInfo.name}</span>
                  </div>
                  {hoverInfo.node &&
                    (() => {
                      const info = resolveNodeThroughputStatus(hoverInfo.node);
                      return (
                        <span className={`mao-tooltip-status ${info.badgeClass}`}>
                          {info.badgeText}
                        </span>
                      );
                    })()}
                </div>

                {hoverInfo.node?.online ? (
                  <div className="mao-tooltip-stats">
                    <div className="mao-tooltip-stat-item">
                      <span className="label">CPU</span>
                      <span className="val">{(hoverInfo.node.cpuPct ?? 0).toFixed(0)}%</span>
                    </div>
                    <div className="mao-tooltip-stat-item">
                      <span className="label">内存</span>
                      <span className="val">
                        {hoverInfo.node.ramTotal > 0
                          ? `${((hoverInfo.node.ramUsed / hoverInfo.node.ramTotal) * 100).toFixed(0)}%`
                          : "0%"}
                      </span>
                    </div>
                    <div className="mao-tooltip-stat-item">
                      <span className="label">实时带宽</span>
                      <span className="val">
                        ↑ {formatByteRateLabel(hoverInfo.node.netUp)} · ↓{" "}
                        {formatByteRateLabel(hoverInfo.node.netDown)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mao-tooltip-offline-hint">
                    此服务器已失联，请及时排查处理。
                  </div>
                )}
                <div className="mao-tooltip-tip">
                  <span>
                    {tooltipTrigger === "touch"
                      ? "再次点击方块直达节点卡片"
                      : "点击方块直达节点卡片"}
                  </span>
                  <span aria-hidden="true">↗</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 底部信息与微型图例 */}
      <div className="mao-progress-section-footer">
        <div className="flex items-center gap-2">
          <span>在线 {onlineNodes} 台</span>
          <div className="mao-legend-colors" aria-hidden="true">
            <span className="mao-legend-text">空闲</span>
            <span
              className="mao-legend-box is-low-load"
              title={colorTheme === "eva" ? "初号机紫 (< 500 KB/s)" : "空闲待机 (< 500 KB/s)"}
            />
            <span
              className="mao-legend-box is-medium-load"
              title={
                colorTheme === "eva"
                  ? "荧光激活绿 (500 KB/s ~ 5 MB/s)"
                  : "活跃传输 (500 KB/s ~ 5 MB/s)"
              }
            />
            <span
              className="mao-legend-box is-high-load"
              title={colorTheme === "eva" ? "装甲警告橙 (≥ 5 MB/s)" : "高吞吐 (≥ 5 MB/s)"}
            />
            <span className="mao-legend-text">高吞吐</span>
          </div>
        </div>
        <span>总计 {totalNodes} 台 · 机架 {totalSlots} 槽</span>
      </div>
    </div>
  );
}
