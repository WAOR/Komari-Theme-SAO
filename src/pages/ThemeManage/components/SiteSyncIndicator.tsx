import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function SiteSyncIndicator({
  phase,
  invalid,
  waiting,
  onRetry,
}: {
  phase: "idle" | "saving" | "synced" | "error";
  invalid: boolean;
  waiting: boolean;
  onRetry?: () => void;
}) {
  if (invalid) {
    return (
      <span
        role="status"
        className="flex items-center gap-1.5 text-xs text-(--status-error) select-none"
        title="设置存在校验错误，修正后将自动保存"
      >
        <AlertCircle size={14} className="shrink-0" />
        <span>设置有误</span>
      </span>
    );
  }

  if (phase === "saving") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 text-xs text-(--text-tertiary) select-none"
      >
        <RefreshCw size={13} className="shrink-0 animate-spin" />
        <span>正在保存...</span>
      </span>
    );
  }

  if (phase === "error") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 text-xs text-(--status-error) select-none"
      >
        <AlertCircle size={14} className="shrink-0" />
        <span>保存失败</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer underline underline-offset-2 hover:text-(--status-error)/80"
          >
            重试
          </button>
        )}
      </span>
    );
  }

  if (waiting) {
    return (
      <span
        role="status"
        className="flex items-center gap-1.5 text-xs text-(--text-tertiary) select-none"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-(--accent-500) animate-pulse" />
        <span>未保存改动</span>
      </span>
    );
  }

  if (phase === "synced") {
    return (
      <span
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5 text-xs text-(--status-success) select-none"
      >
        <CheckCircle2 size={14} className="shrink-0" />
        <span>已同步</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      className="flex items-center gap-1.5 text-xs text-(--text-tertiary) opacity-70 select-none"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-(--hairline)" />
      <span>配置就绪</span>
    </span>
  );
}
