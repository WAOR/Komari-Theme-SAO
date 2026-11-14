import { memo, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import type { BandwidthTierItem } from "../constants";

export const BandwidthTierCard = memo(function BandwidthTierCard({
  tier,
  customValue,
  disabled,
  onCommit,
  onReset,
}: {
  tier: BandwidthTierItem;
  customValue: string | undefined;
  disabled: boolean;
  onCommit: (val: string) => void;
  onReset: () => void;
}) {
  const [text, setText] = useState<string>(customValue ?? tier.defaultLabel);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setText(customValue ?? tier.defaultLabel);
    }
  }, [customValue, tier.defaultLabel]);

  const isCustom = Boolean(customValue && customValue !== tier.defaultLabel);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    e.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value.replace(/,/g, "");
    setText(nextVal);
    onCommit(nextVal);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    const trimmed = text.trim();
    if (!trimmed || trimmed === tier.defaultLabel) {
      setText(tier.defaultLabel);
      onReset();
    } else {
      setText(trimmed);
      onCommit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setText(customValue ?? tier.defaultLabel);
      e.currentTarget.blur();
    }
  };

  const handleReset = () => {
    setText(tier.defaultLabel);
    onReset();
  };

  return (
    <div className="surface-inset rounded-xl p-3.5 flex flex-col items-center justify-between gap-3 text-center border border-(--hairline) hover:border-(--hairline-hover) transition-colors group/card">
      <div className="w-full flex items-center justify-between text-[11px] text-(--text-muted)">
        <span className="font-medium text-(--text-secondary)">{tier.tierTitle}</span>
        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-(--bg-card) text-(--text-secondary) border border-(--hairline) shadow-2xs">
          {tier.threshold}
        </span>
      </div>

      <div className="py-1 flex items-center justify-center gap-1.5 w-full">
        <div
          className={clsx(
            "overview-card-rating is-bandwidth-badge pr-2! pl-5! transition-all shadow-xs cursor-text",
            "focus-within:border-(--border-strong) focus-within:shadow-xs"
          )}
          data-rating-level={tier.level}
          title="点击直接修改徽章文字"
        >
          <span className="mao-status-dot" />
          <input
            type="text"
            disabled={disabled}
            value={text}
            placeholder={tier.defaultLabel}
            onFocus={handleFocus}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              width: `${Math.max(4, (text || tier.defaultLabel).length) + 1.2}ch`,
              outline: "none",
              boxShadow: "none",
            }}
            className="theme-manage-search-input bg-transparent border-none outline-none text-center font-inherit text-inherit tracking-inherit text-[11px] font-bold min-w-11.5 max-w-25 cursor-text placeholder:opacity-35 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            aria-label={`${tier.tierTitle}分级词`}
          />
        </div>

        {isCustom && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleReset}
            title={`恢复默认（${tier.defaultLabel}）`}
            className="p-1 rounded-md text-(--text-muted) hover:text-(--accent-400) hover:bg-(--surface-hover) transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>

      <span className="text-[10px] text-(--text-tertiary) leading-tight">
        {tier.desc}
      </span>
    </div>
  );
});
