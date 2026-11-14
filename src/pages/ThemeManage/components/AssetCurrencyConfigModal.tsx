import { useState, useEffect } from "react";
import { X, Check, Coins } from "lucide-react";

export type CostCurrency = "CNY" | "USD" | "EUR";

export interface CurrencyOption {
  code: CostCurrency;
  symbol: string;
  name: string;
  desc: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  {
    code: "CNY",
    symbol: "¥",
    name: "人民币 (CNY)",
    desc: "中国人民币 · 默认货币单位",
  },
  {
    code: "USD",
    symbol: "$",
    name: "美元 (USD)",
    desc: "美元 · 全球通用结算货币",
  },
  {
    code: "EUR",
    symbol: "€",
    name: "欧元 (EUR)",
    desc: "欧元 · 欧洲单一货币",
  },
];

export interface AssetCurrencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrency: CostCurrency;
  onSave: (currency: CostCurrency) => void;
}

export function AssetCurrencyConfigModal({
  isOpen,
  onClose,
  currentCurrency,
  onSave,
}: AssetCurrencyConfigModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CostCurrency>(currentCurrency || "CNY");

  useEffect(() => {
    if (isOpen) {
      setSelectedCurrency(currentCurrency || "CNY");
    }
  }, [isOpen, currentCurrency]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSave(selectedCurrency);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-(--hairline) bg-(--bg-card) shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-currency-modal-title"
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-(--hairline) bg-(--surface-elev)/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-(--accent-500)/10 border border-(--accent-500)/20 flex items-center justify-center text-(--accent-500) shrink-0">
              <Coins size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="asset-currency-modal-title"
                  className="text-xs sm:text-sm font-semibold text-(--text-primary) shrink-0"
                >
                  资产总值货币设置
                </h3>
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500) shrink-0">
                  {selectedCurrency}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-(--text-muted) mt-0.5 leading-tight sm:leading-normal">
                选择资产总值卡片汇总与展示的目标货币单位
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

        {/* 货币选择列表 */}
        <div className="p-3 sm:p-4 space-y-2">
          {CURRENCY_OPTIONS.map((opt) => {
            const isSelected = selectedCurrency === opt.code;
            return (
              <div
                key={opt.code}
                onClick={() => setSelectedCurrency(opt.code)}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? "border-(--accent-500) bg-(--accent-500)/10 shadow-xs text-(--text-primary)"
                    : "border-(--hairline) bg-(--surface-elev)/30 hover:bg-(--surface-elev)/60 hover:border-(--hairline-strong,var(--hairline)) text-(--text-secondary)"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-all ${
                      isSelected
                        ? "bg-(--accent-500) text-white border-(--accent-500) shadow-xs"
                        : "bg-(--bg-card) border-(--hairline) text-(--text-primary)"
                    }`}
                  >
                    {opt.symbol}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-semibold text-(--text-primary)">
                        {opt.name}
                      </span>
                      {opt.code === "CNY" && (
                        <span className="text-[9px] font-medium px-1 py-0.2 rounded border border-(--hairline) bg-(--bg-card) text-(--text-muted)">
                          默认
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-(--text-muted) truncate mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? "border-(--accent-500) bg-(--accent-500) text-white"
                      : "border-(--hairline) bg-(--bg-card)"
                  }`}
                >
                  {isSelected && <Check size={11} strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部按钮栏 */}
        <div className="flex items-center justify-between gap-2 p-2.5 sm:p-3.5 border-t border-(--hairline) bg-(--surface-elev)/20">
          <button
            type="button"
            onClick={() => setSelectedCurrency("CNY")}
            className="px-2.5 py-1.5 rounded-lg text-xs text-(--text-muted) hover:text-(--text-primary) hover:bg-(--surface-elev) transition-all cursor-pointer"
          >
            恢复人民币 (CNY)
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
              onClick={handleConfirm}
              className="px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-(--accent-500) text-white hover:opacity-90 active:scale-98 shadow-xs transition-all cursor-pointer"
            >
              确定保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

