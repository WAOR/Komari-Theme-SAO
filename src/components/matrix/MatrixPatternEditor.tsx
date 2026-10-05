import { useState, useRef, useEffect, useMemo } from "react";
import { Play, Trash2, Sparkles, Plus, X, Send } from "lucide-react";
import {
  GRID_COLUMNS,
  TOTAL_PIXELS,
  PATTERN_PRESETS,
  DEFAULT_PATTERN,
  getPatternPixelSet,
  loadUserMatrixPresets,
  saveUserMatrixPresets,
  type UserMatrixPreset,
  MAX_USER_PRESETS,
} from "@/utils/matrixPatterns";

export interface MatrixPatternEditorProps {
  /** 全站当前生效的点阵图案 */
  value: number[] | null | undefined;
  /** 云端保存的用户自定义预设列表（跨设备漫游） */
  userPresets?: UserMatrixPreset[];
  /** 兼容旧版 onChange（可选） */
  onChange?: (pattern: number[] | null) => void;
  /** 点击「应用到首页」时触发（精准 1 次同步到云端） */
  onApply?: (pattern: number[] | null) => void;
  /** 保存或删除用户预设时触发（精准 1 次同步到云端） */
  onSaveUserPresets?: (presets: UserMatrixPreset[]) => void;
  colorTheme?: "default" | "eva";
}

export function MatrixPatternEditor({
  value,
  userPresets: externalUserPresets,
  onChange,
  onApply,
  onSaveUserPresets,
  colorTheme = "default",
}: MatrixPatternEditorProps) {
  // 当前画板像素点亮集合（纯本地草稿状态，绘制过程绝不自动向云端发请求）
  const [pixels, setPixels] = useState<Set<number>>(() => getPatternPixelSet(value));

  // 动画预览状态
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewCol, setPreviewCol] = useState(-1);
  const [previewPhase, setPreviewPhase] = useState<"idle" | "scan" | "hold">("idle");
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 用户自定义预设列表：优先使用外部传入的云端预设，否则回退使用本地 localStorage
  const [localPresets, setLocalPresets] = useState<UserMatrixPreset[]>(() =>
    loadUserMatrixPresets(),
  );

  const activePresets = useMemo(() => {
    if (Array.isArray(externalUserPresets)) {
      return externalUserPresets;
    }
    return localPresets;
  }, [externalUserPresets, localPresets]);

  // 当外部生效值发生变更时，同步画板初始状态
  useEffect(() => {
    setPixels(getPatternPixelSet(value));
  }, [value]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, []);

  // 计算当前画板是否与全站当前生效值存在差异（未应用改动）
  const externalPatternSet = useMemo(() => getPatternPixelSet(value), [value]);
  const hasUnappliedChanges = useMemo(() => {
    if (pixels.size !== externalPatternSet.size) return true;
    for (const idx of pixels) {
      if (!externalPatternSet.has(idx)) return true;
    }
    return false;
  }, [pixels, externalPatternSet]);

  // 单击切换单元格点亮状态（标准 onClick，移动端/桌面端统一，零延迟零误触）
  const toggleCell = (index: number) => {
    if (isPreviewing) return;
    setPixels((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // 应用某个预设到画布（纯本地加载到画板，不自动触发同步）
  const applyPresetToCanvas = (indices: number[]) => {
    if (isPreviewing) return;
    setPixels(new Set(indices));
  };

  // 清空画布（纯本地操作，不自动触发同步）
  const handleClear = () => {
    if (isPreviewing) return;
    setPixels(new Set<number>());
  };

  // 点击「应用到首页」：明确触发一次提交并同步到云端
  const handleApplyToSite = () => {
    if (isPreviewing) return;
    const defaultSet = new Set(DEFAULT_PATTERN);
    const isDefault =
      pixels.size === defaultSet.size &&
      Array.from(pixels).every((idx) => defaultSet.has(idx));

    const finalPattern = isDefault ? null : Array.from(pixels).sort((a, b) => a - b);
    if (onApply) {
      onApply(finalPattern);
    } else if (onChange) {
      onChange(finalPattern);
    }
  };

  // 保存当前画布设计为用户预设（触发 1 次云端同步）
  const handleSaveUserPreset = () => {
    if (activePresets.length >= MAX_USER_PRESETS) {
      window.alert(`最多保存 ${MAX_USER_PRESETS} 个自定义预设，请先删除不需要的预设。`);
      return;
    }
    const defaultName = `预设 ${activePresets.length + 1}`;
    const inputName = window.prompt("请输入用户预设名称：", defaultName);
    if (inputName === null) return;
    const finalName = inputName.trim() || defaultName;

    const newPreset: UserMatrixPreset = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: finalName,
      indices: Array.from(pixels).sort((a, b) => a - b),
      createdAt: Date.now(),
    };

    const nextPresets = [...activePresets, newPreset];
    setLocalPresets(nextPresets);
    saveUserMatrixPresets(nextPresets);
    onSaveUserPresets?.(nextPresets);
  };

  // 删除指定的自定义预设（触发 1 次云端同步）
  const handleDeleteUserPreset = (id: string, name: string) => {
    if (!window.confirm(`确定删除用户预设「${name}」吗？`)) return;
    const nextPresets = activePresets.filter((p) => p.id !== id);
    setLocalPresets(nextPresets);
    saveUserMatrixPresets(nextPresets);
    onSaveUserPresets?.(nextPresets);
  };

  // 播放开屏动画预览
  const startPreview = () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    setPreviewPhase("scan");
    setPreviewCol(-1);

    let current = 0;
    const interval = setInterval(() => {
      setPreviewCol(current);
      current++;
      if (current > GRID_COLUMNS) {
        clearInterval(interval);
        setPreviewPhase("hold");
        setTimeout(() => {
          setPreviewPhase("idle");
          setIsPreviewing(false);
          setPreviewCol(-1);
        }, 1500);
      }
    }, 28);
    previewTimerRef.current = interval;
  };

  // 判断当前像素在预览模式下的展示样式
  const getCellPreviewClass = (index: number) => {
    if (!isPreviewing || previewPhase === "idle") {
      return pixels.has(index) ? "is-lit" : "";
    }
    const col = index % GRID_COLUMNS;
    const isLit = pixels.has(index);

    if (previewPhase === "scan") {
      if (col === previewCol) return "is-scan-beam";
      if (col < previewCol) return isLit ? "is-lit" : "";
      return "is-unlit";
    }
    if (previewPhase === "hold") {
      return isLit ? "is-lit is-preview-pulse" : "";
    }
    return "";
  };

  return (
    <div className="mao-pattern-editor">
      {/* 顶部工具栏与状态 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-(--text-secondary) flex items-center gap-1">
            <Sparkles size={13} className="text-(--accent-500)" />
            绘制画布 (20 × 5)
          </span>
          <span className="text-[10px] text-(--text-muted) px-1.5 py-0.5 rounded bg-(--bg-card) border border-(--hairline)">
            已点亮 {pixels.size} / {TOTAL_PIXELS} 格
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={startPreview}
            disabled={isPreviewing}
            className="mao-pattern-action-btn is-play"
            title="播放开屏扫描与呼吸预览"
          >
            <Play size={12} className={isPreviewing ? "animate-pulse" : ""} />
            <span>{isPreviewing ? "预览中..." : "动效预览"}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isPreviewing || pixels.size === 0}
            className="mao-pattern-action-btn"
            title="清空当前画布"
          >
            <Trash2 size={12} />
            <span>清空</span>
          </button>

          <div className="h-3.5 w-px bg-(--hairline) mx-0.5" />

          {/* 核心意愿触发：点击后精准将画布应用到全站首页并同步 */}
          <button
            type="button"
            onClick={handleApplyToSite}
            disabled={isPreviewing}
            className={`mao-pattern-action-btn is-apply relative ${
              hasUnappliedChanges ? "has-changes" : ""
            }`}
            title={
              hasUnappliedChanges
                ? "当前画板有未应用的改动，点击应用到首页并同步云端"
                : "当前画板设计与首页一致"
            }
          >
            <Send size={11} />
            <span>应用到首页</span>
          </button>
        </div>
      </div>

      {/* 20 × 5 微型像素网格画布 */}
      <div
        className={`mao-pattern-canvas ${colorTheme === "eva" ? "is-eva" : ""}`}
        data-palette={colorTheme}
        role="grid"
        aria-label="点阵开屏图案绘制画布"
      >
        {Array.from({ length: TOTAL_PIXELS }, (_, idx) => {
          const previewClass = getCellPreviewClass(idx);
          const isLit = pixels.has(idx);

          return (
            <button
              key={idx}
              type="button"
              disabled={isPreviewing}
              data-pixel-index={idx}
              className={`mao-pattern-cell ${previewClass}`}
              onClick={() => toggleCell(idx)}
              aria-label={`第 ${Math.floor(idx / GRID_COLUMNS) + 1} 行，第 ${(idx % GRID_COLUMNS) + 1} 列: ${
                isLit ? "已点亮" : "未点亮"
              }`}
            />
          );
        })}
      </div>

      {/* 底部常用预设快捷选用 */}
      <div className="mt-2.5 pt-2 border-t border-(--hairline)/60 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-(--text-muted) mr-0.5">常用预设:</span>
        {Object.values(PATTERN_PRESETS).map((preset) => {
          const isCurrent =
            pixels.size === preset.indices.length &&
            preset.indices.every((idx) => pixels.has(idx));

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPresetToCanvas(preset.indices)}
              disabled={isPreviewing}
              className={`mao-preset-chip ${isCurrent ? "is-active" : ""}`}
              title="载入画布预览（不自动提交）"
            >
              {preset.name}
            </button>
          );
        })}
      </div>

      {/* 用户自定义预设快捷选用（云端漫游，跨设备不丢） */}
      <div className="mt-2 pt-2 border-t border-(--hairline)/40 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-(--text-muted) mr-0.5">用户预设:</span>
        <button
          type="button"
          onClick={handleSaveUserPreset}
          disabled={isPreviewing}
          className="mao-preset-chip is-add flex items-center gap-0.5"
          title="将当前画布设计保存为用户预设（保存至云端，跨设备不丢）"
        >
          <Plus size={11} />
          <span>存为预设</span>
        </button>

        {activePresets.length === 0 ? (
          <span className="text-[10px] text-(--text-muted)/70 italic ml-0.5">
            (暂无保存的预设，绘制后点击「存为预设」)
          </span>
        ) : (
          activePresets.map((preset) => {
            const isCurrent =
              pixels.size === preset.indices.length &&
              preset.indices.every((idx) => pixels.has(idx));

            return (
              <div key={preset.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => applyPresetToCanvas(preset.indices)}
                  disabled={isPreviewing}
                  className={`mao-preset-chip flex items-center gap-1.5 ${
                    isCurrent ? "is-active" : ""
                  }`}
                  title={`载入此预设到画布（点亮 ${preset.indices.length} 格）`}
                >
                  <span>{preset.name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUserPreset(preset.id, preset.name);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        handleDeleteUserPreset(preset.id, preset.name);
                      }
                    }}
                    className="inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors text-[10px] leading-none"
                    title="从云端删除此预设"
                  >
                    <X size={9} />
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
