import type { HomepagePingLine, PingOverviewItem } from "@/types/komari";

export type CarrierType = "ct" | "cu" | "cm" | "unknown";
export type LossTier = "good" | "warning" | "error";

export function getLossTier(loss: number | null | undefined): LossTier {
  if (loss == null || !Number.isFinite(loss) || loss <= 3) return "good";
  if (loss <= 15) return "warning";
  return "error";
}

export interface SingleCarrierLoss {
  loss: number | null;
  count: number;
}

export interface CarrierLossSummary {
  peakLoss: number | null;
  avgLoss: number | null;
  ct: SingleCarrierLoss;
  cu: SingleCarrierLoss;
  cm: SingleCarrierLoss;
  hasAnyData: boolean;
  isMultiPingMode: boolean;
}

/**
 * 根据 Ping 任务名称智能识别所属运营商：
 * - 电信 (CT): 匹配 电信、中国电信、ct、chinatelecom 等
 * - 联通 (CU): 匹配 联通、中国联通、cu、chinaunicom 等
 * - 移动 (CM): 匹配 移动、中国移动、cm、chinamobile 等
 */
export function detectCarrier(taskName: string): CarrierType {
  const name = taskName.trim().toLowerCase();
  if (/(?:中国)?电信|\bct\b|china\s*telecom/i.test(name)) {
    return "ct";
  }
  if (/(?:中国)?联通|\bcu\b|china\s*unicom/i.test(name)) {
    return "cu";
  }
  if (/(?:中国)?移动|\bcm\b|china\s*mobile/i.test(name)) {
    return "cm";
  }
  return "unknown";
}

/**
 * 汇聚多节点多线路的丢包数据，计算三网丢包总览 (策略 A: 峰值与各运营商聚合)
 */
export function calculateCarrierLoss(
  multiLines: Map<string, HomepagePingLine[]>,
  singleItems: Map<string, PingOverviewItem>,
  visibleUuids?: readonly string[],
  isMultiPingMode = true,
): CarrierLossSummary {
  if (!isMultiPingMode) {
    return {
      peakLoss: null,
      avgLoss: null,
      ct: { loss: null, count: 0 },
      cu: { loss: null, count: 0 },
      cm: { loss: null, count: 0 },
      hasAnyData: false,
      isMultiPingMode: false,
    };
  }

  const ctLosses: number[] = [];
  const cuLosses: number[] = [];
  const cmLosses: number[] = [];

  const targetUuids = visibleUuids
    ? [...visibleUuids]
    : [...new Set([...multiLines.keys(), ...singleItems.keys()])];

  for (const uuid of targetUuids) {
    const lines = multiLines.get(uuid);
    if (lines && lines.length > 0) {
      lines.forEach((line) => {
        const carrier = detectCarrier(line.taskName || "");

        if (typeof line.loss === "number" && Number.isFinite(line.loss)) {
          if (carrier === "ct") ctLosses.push(line.loss);
          else if (carrier === "cu") cuLosses.push(line.loss);
          else if (carrier === "cm") cmLosses.push(line.loss);
        }
      });
    } else {
      const item = singleItems.get(uuid);
      if (item && typeof item.loss === "number" && Number.isFinite(item.loss)) {
        // 单项 ping 任务若未区分运营商，可供参考
      }
    }
  }

  const calcAvg = (arr: number[]): SingleCarrierLoss => {
    if (arr.length === 0) return { loss: null, count: 0 };
    const sum = arr.reduce((acc, v) => acc + v, 0);
    return {
      loss: Math.round((sum / arr.length) * 10) / 10,
      count: arr.length,
    };
  };

  const ct = calcAvg(ctLosses);
  const cu = calcAvg(cuLosses);
  const cm = calcAvg(cmLosses);

  const availableLosses = [ct.loss, cu.loss, cm.loss].filter(
    (v): v is number => v !== null,
  );
  const hasAnyData = availableLosses.length > 0;
  const peakLoss = hasAnyData ? Math.max(...availableLosses) : null;
  const avgLoss = hasAnyData
    ? Math.round(
        (availableLosses.reduce((acc, v) => acc + v, 0) /
          availableLosses.length) *
          10,
      ) / 10
    : null;

  return {
    peakLoss,
    avgLoss,
    ct,
    cu,
    cm,
    hasAnyData,
    isMultiPingMode: true,
  };
}

