import { memo } from "react";
import { Flag } from "@/components/ui/Flag";
import type { AdminClient } from "@/types/komari";
import { calculateCostSummary, formatCnyMoney, formatSignedCny } from "@/utils/cost";
import type { CostPremiumEntry } from "@/utils/cost";

export type PremiumDetail = ReturnType<typeof calculateCostSummary>["details"][number];

export const PremiumList = memo(function PremiumList({
  clients,
  costPremiums,
  detailByUuid,
  rateLoading,
  acquiredAtMax,
  onPatchPaid,
  onPatchAcquiredAt,
}: {
  clients: AdminClient[];
  costPremiums: Record<string, CostPremiumEntry>;
  detailByUuid: Map<string, PremiumDetail>;
  rateLoading: boolean;
  acquiredAtMax: string;
  onPatchPaid: (uuid: string, rawValue: string) => void;
  onPatchAcquiredAt: (uuid: string, rawValue: string) => void;
}) {
  return (
    <div className="surface-inset max-h-80 overflow-y-auto">
      {clients.map((client) => {
        const entry = costPremiums[client.uuid];
        const detail = detailByUuid.get(client.uuid);
        const referenceLabel = rateLoading
          ? "计算中"
          : detail
            ? detail.counted
              ? formatCnyMoney(detail.remainingCny)
              : detail.note || "--"
            : "--";
        const canCompute = detail != null && (detail.counted || detail.note === "免费");
        return (
          <div
            key={client.uuid}
            className="flex flex-col gap-2 border-b border-(--hairline) px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Flag region={client.region ?? ""} size={13} />
                <span
                  className="truncate text-[13px] text-(--text-primary)"
                  title={client.name}
                >
                  {client.name}
                </span>
              </div>
              <span
                className="shrink-0 text-[11px] text-(--text-tertiary)"
                title="该节点当前剩余价值（按账单周期折算，不含溢价）"
              >
                {referenceLabel}
              </span>
              {entry && (
                <span
                  className="shrink-0 text-[11px] font-medium"
                  style={{
                    color:
                      entry.amount > 0
                        ? "var(--status-error)"
                        : entry.amount < 0
                          ? "var(--status-success)"
                          : "var(--text-tertiary)",
                  }}
                  title={
                    entry.paidCny != null
                      ? "溢价 = 收购价 − 收购日剩余价值；该折算基准已经固化"
                      : "旧格式：直接记录的溢价，填写收购价后自动升级"
                  }
                >
                  溢价 {formatSignedCny(entry.amount)}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={entry?.paidCny ?? ""}
                onChange={(event) => {
                  if (event.target.validity.badInput) return;
                  onPatchPaid(client.uuid, event.target.value);
                }}
                placeholder="收购价"
                disabled={!canCompute}
                aria-label={`${client.name} 的收购价`}
                title={
                  canCompute
                    ? "实际收购价（人民币），留空即清除记录"
                    : "该节点已忽略或汇率缺失，无法折算剩余价值"
                }
                className="surface-inset w-24 px-2 py-1 text-right text-[13px] outline-none disabled:opacity-45 max-sm:flex-1 min-w-0"
              />
              <input
                type="date"
                max={acquiredAtMax}
                value={entry?.acquiredAt ?? ""}
                onChange={(event) => onPatchAcquiredAt(client.uuid, event.target.value)}
                disabled={!entry || !canCompute}
                aria-label={`${client.name} 的收购日期`}
                title={
                  canCompute
                    ? "收购日期：修改后会按当前价格、周期、到期日和汇率回算该日剩余价值，重新计算并固化溢价"
                    : "该节点已忽略或汇率缺失，无法折算剩余价值"
                }
                className="surface-inset w-35 px-2 py-1 text-[12px] outline-none disabled:opacity-45 max-sm:flex-1 min-w-0"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});
