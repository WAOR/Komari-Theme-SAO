import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  CircleDollarSign,
  FileText,
  Gauge,
  Layers,
  RotateCcw,
  Timer,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  HOME_SORT_FIELDS,
  HOME_SORT_FIELD_LABELS,
  type HomeSortDirection,
  type HomeSortField,
} from "@/utils/homeSort";
import type { HomeSortControlState } from "@/hooks/useHomeSort";

export interface HomeSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: HomeSortControlState;
  palette?: string;
  defaultField?: HomeSortField;
  defaultDirection?: HomeSortDirection;
}

const FIELD_ICONS: Record<HomeSortField, LucideIcon> = {
  default: Layers,
  name: FileText,
  uptime: Timer,
  speed: Gauge,
  traffic: ArrowUpDown,
  price: CircleDollarSign,
};

const FIELD_DESCRIPTIONS: Record<HomeSortField, string> = {
  default: "按后台配置权重默认展示",
  name: "按服务器名称与拼音字母顺序",
  uptime: "按开机持续运行时长排布",
  speed: "按当前实时网络总速率",
  traffic: "按总消耗网络出入站流量",
  price: "按机器月化持有价格成本",
};

function getDirectionLabel(field: HomeSortField, direction: HomeSortDirection): string {
  const isAsc = direction === "asc";
  if (field === "name") return isAsc ? "升序 (A→Z)" : "降序 (Z→A)";
  if (field === "uptime") return isAsc ? "升序 (从短到长)" : "降序 (从长到短)";
  if (field === "default") return isAsc ? "默认顺序" : "相反顺序";
  return isAsc ? "升序 (从低到高)" : "降序 (从高到低)";
}

function getNaturalHint(field: HomeSortField): string {
  if (field === "name") return "默认 A→Z";
  if (field === "uptime") return "默认 从长到短";
  if (field === "default") return "默认 权重";
  return "默认 从高到低";
}

export function HomeSortModal({
  isOpen,
  onClose,
  state,
  palette = "default",
  defaultField = "default",
  defaultDirection = "asc",
}: HomeSortModalProps) {
  const { field, direction, setField, toggleDirection } = state;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCustomized = field !== defaultField || direction !== defaultDirection;

  const handleSelect = (targetField: HomeSortField) => {
    if (targetField === field) {
      toggleDirection();
    } else {
      setField(targetField);
    }
  };

  const handleReset = () => {
    setField(defaultField);
    if (direction !== defaultDirection) {
      toggleDirection();
    }
  };

  return createPortal(
    <div
      className="home-sort-modal-backdrop"
      data-palette={palette}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sort-modal-title"
    >
      <div className="home-sort-modal" ref={modalRef}>
        {/* 头部标题与关闭按钮 */}
        <div className="home-sort-modal-header">
          <div className="flex items-center gap-2">
            <div className="home-sort-modal-header-icon">
              <ArrowUpDown size={16} />
            </div>
            <div>
              <h2 id="sort-modal-title" className="home-sort-modal-title">
                服务器排序
              </h2>
              <p className="home-sort-modal-subtitle">
                选择集群卡片的排序指标与排序方向
              </p>
            </div>
          </div>
          <button
            type="button"
            className="home-sort-modal-close"
            onClick={onClose}
            aria-label="关闭排序弹窗"
          >
            <X size={16} />
          </button>
        </div>

        {/* 排序选项列表 */}
        <div className="home-sort-modal-body">
          <div className="home-sort-modal-grid">
            {HOME_SORT_FIELDS.map((option) => {
              const active = option === field;
              const Icon = FIELD_ICONS[option];
              const isAsc = direction === "asc";

              return (
                <div
                  key={option}
                  className={`home-sort-option-card${active ? " is-active" : ""}`}
                  onClick={() => handleSelect(option)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelect(option);
                    }
                  }}
                  aria-pressed={active}
                >
                  <div className="home-sort-option-left">
                    <div className="home-sort-option-icon">
                      <Icon size={17} />
                    </div>
                    <div className="home-sort-option-info">
                      <div className="home-sort-option-name-row">
                        <span className="home-sort-option-name">
                          {HOME_SORT_FIELD_LABELS[option]}
                        </span>
                        {active && (
                          <span className="home-sort-option-badge">生效中</span>
                        )}
                      </div>
                      <span className="home-sort-option-desc">
                        {FIELD_DESCRIPTIONS[option]}
                      </span>
                    </div>
                  </div>

                  <div className="home-sort-option-right">
                    {active ? (
                      <button
                        type="button"
                        className="home-sort-direction-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDirection();
                        }}
                        title={`点击切换方向`}
                        aria-label={`当前方向：${getDirectionLabel(option, direction)}，点击切换`}
                      >
                        {isAsc ? (
                          <ArrowUpNarrowWide size={13} />
                        ) : (
                          <ArrowDownWideNarrow size={13} />
                        )}
                        <span>{getDirectionLabel(option, direction)}</span>
                      </button>
                    ) : (
                      <span className="home-sort-option-hint">
                        {getNaturalHint(option)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="home-sort-modal-footer">
          {isCustomized ? (
            <button
              type="button"
              className="home-sort-reset-btn"
              onClick={handleReset}
            >
              <RotateCcw size={13} />
              <span>恢复默认排序</span>
            </button>
          ) : (
            <span className="text-[12px] text-(--text-tertiary)">
              当前为系统默认推荐排序
            </span>
          )}
          <button
            type="button"
            className="home-sort-confirm-btn"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
