import { useMemo } from "react";
import { CircleDollarSign, Search } from "lucide-react";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { COST_RATE_PRESETS } from "@/utils/cost";
import { DEFAULT_THEME_SETTINGS } from "@/utils/themeSettings";
import { PremiumList, type PremiumDetail } from "../components/PremiumList";
import type { AdminClient } from "@/types/komari";
import type { ThemeDraft } from "../types";

export function CostTab({
  draft,
  patch,
  draftCostRateApiUrlInvalid,
  premiumSearch,
  setPremiumSearch,
  clientsLoading,
  sortedClients,
  filteredPremiumClients,
  premiumDetailByUuid,
  rateLoading,
  acquiredAtMax,
  patchPremiumPaid,
  patchPremiumAcquiredAt,
}: {
  draft: ThemeDraft;
  patch: <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => void;
  draftCostRateApiUrlInvalid: boolean;
  premiumSearch: string;
  setPremiumSearch: (val: string) => void;
  clientsLoading: boolean;
  sortedClients: AdminClient[];
  filteredPremiumClients: AdminClient[];
  premiumDetailByUuid: Map<string, PremiumDetail>;
  rateLoading: boolean;
  acquiredAtMax: string;
  patchPremiumPaid: (uuid: string, val: string) => void;
  patchPremiumAcquiredAt: (uuid: string, val: string) => void;
}) {
  const premiumConfiguredCount = useMemo(
    () => Object.keys(draft.costPremiums).length,
    [draft.costPremiums],
  );

  return (
    <>
      <InstancePanel
        kicker="资产"
        title="财务设置"
        description="管理外币自动换算汇率，并可排除免流或不计费机器。"
        aside={<CircleDollarSign size={16} />}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-inset flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="setting-subhead-title">汇率接口</span>
                <span className="setting-hint">留空使用默认</span>
              </div>

              <div className="cost-rate-presets">
                {COST_RATE_PRESETS.map((preset) => {
                  const isDefault = preset.id === "frankfurter";
                  const active =
                    (draft.costRateApiUrl.trim() === "" && isDefault) ||
                    draft.costRateApiUrl.trim() === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-active={active ? "true" : "false"}
                      aria-pressed={active}
                      onClick={() => {
                        patch("costRateApiUrl", isDefault ? "" : preset.url);
                      }}
                    >
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>

              <input
                value={draft.costRateApiUrl}
                onChange={(event) => patch("costRateApiUrl", event.target.value)}
                placeholder={DEFAULT_THEME_SETTINGS.costRateApiUrl}
                aria-invalid={draftCostRateApiUrlInvalid}
                className="surface-inset w-full px-3 py-2 text-[13px] outline-none"
              />
              <span className="setting-hint text-pretty">
                {draftCostRateApiUrlInvalid
                  ? "请输入 http(s) 链接，保存后将回退默认接口"
                  : "点击上方预设一键切换，亦可直接输入自定义链接。"}
              </span>
            </div>

            <div className="surface-inset flex flex-col gap-2 px-4 py-3">
              <span className="setting-subhead-title">排除机器</span>
              <textarea
                rows={3}
                value={draft.costIgnoredText}
                onChange={(event) => patch("costIgnoredText", event.target.value)}
                placeholder="每行一个节点名称 / UUID，也可以用逗号分隔"
                className="surface-inset min-h-24 w-full resize-y p-2.5 text-[13px] outline-none font-mono"
              />
              <span className="setting-hint">填入的机器不计入资产总值与续费成本。</span>
            </div>
          </div>
        </div>
      </InstancePanel>

      {/* 面板 2: 买入溢价 */}
      <InstancePanel
        kicker="溢价"
        title="买入溢价"
        description="记录二手收机或溢价花费，系统自动平摊计算实际成本。"
        aside={<CircleDollarSign size={16} />}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <label className="surface-inset flex flex-1 max-w-sm items-center gap-2 px-3 py-1.5 transition-colors focus-within:border-(--border-strong)">
              <Search size={14} className="text-(--text-tertiary)" />
              <input
                value={premiumSearch}
                onChange={(event) => setPremiumSearch(event.target.value)}
                placeholder="搜索服务器…"
                aria-label="搜索节点"
                className="theme-manage-search-input min-w-0 flex-1 border-0 bg-transparent text-[13px] text-(--text-primary) shadow-none outline-none ring-0 placeholder:text-(--text-tertiary) focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                style={{ outline: "none", boxShadow: "none", border: "none" }}
              />
            </label>
            <span className="setting-hint shrink-0">
              已记录 {premiumConfiguredCount} 台溢价
            </span>
          </div>

          {clientsLoading && (
            <div className="flex min-h-[15vh] items-center justify-center">
              <Spinner size={24} />
            </div>
          )}

          {!clientsLoading && sortedClients.length === 0 && (
            <div className="theme-manage-empty-state">
              <span>还没有任何节点。</span>
            </div>
          )}

          {!clientsLoading && sortedClients.length > 0 && filteredPremiumClients.length === 0 && (
            <div className="surface-inset px-4 py-5 text-[13px] text-(--text-secondary)">
              没有匹配的节点。
            </div>
          )}

          {!clientsLoading && filteredPremiumClients.length > 0 && (
            <PremiumList
              clients={filteredPremiumClients}
              costPremiums={draft.costPremiums}
              detailByUuid={premiumDetailByUuid}
              rateLoading={rateLoading}
              acquiredAtMax={acquiredAtMax}
              onPatchPaid={patchPremiumPaid}
              onPatchAcquiredAt={patchPremiumAcquiredAt}
            />
          )}
        </div>
      </InstancePanel>
    </>
  );
}
