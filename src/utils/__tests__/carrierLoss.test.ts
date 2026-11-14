import { describe, expect, it } from "vitest";
import { calculateCarrierLoss, detectCarrier, getLossTier } from "../carrierLoss";
import type { HomepagePingLine } from "@/types/komari";

describe("detectCarrier", () => {
  it("识别中国电信", () => {
    expect(detectCarrier("电信节点")).toBe("ct");
    expect(detectCarrier("中国电信")).toBe("ct");
    expect(detectCarrier("Shanghai ChinaTelecom")).toBe("ct");
    expect(detectCarrier("China Telecom")).toBe("ct");
    expect(detectCarrier("CT-Ping-Task")).toBe("ct");
    // 排除泛用词、客服号与其它代号
    expect(detectCarrier("189 节点")).toBe("unknown");
    expect(detectCarrier("Global Telecom Node")).toBe("unknown");
  });

  it("识别中国联通", () => {
    expect(detectCarrier("联通监控")).toBe("cu");
    expect(detectCarrier("中国联通")).toBe("cu");
    expect(detectCarrier("ChinaUnicom Test")).toBe("cu");
    expect(detectCarrier("China Unicom")).toBe("cu");
    expect(detectCarrier("CU-Line")).toBe("cu");
    // 排除泛用词与客服号
    expect(detectCarrier("10010 监控")).toBe("unknown");
    expect(detectCarrier("Unicom Global")).toBe("unknown");
  });

  it("识别中国移动", () => {
    expect(detectCarrier("移动节点")).toBe("cm");
    expect(detectCarrier("中国移动")).toBe("cm");
    expect(detectCarrier("ChinaMobile Test")).toBe("cm");
    expect(detectCarrier("China Mobile")).toBe("cm");
    expect(detectCarrier("CM-Task")).toBe("cm");
    // 排除泛用词、客服号与线路代号 (如 T-Mobile, CMI)
    expect(detectCarrier("10086 节点")).toBe("unknown");
    expect(detectCarrier("CMI 节点")).toBe("unknown");
    expect(detectCarrier("T-Mobile US")).toBe("unknown");
    expect(detectCarrier("Mobile Web Test")).toBe("unknown");
  });

  it("未知识别", () => {
    expect(detectCarrier("Google DNS")).toBe("unknown");
  });
});

describe("getLossTier", () => {
  it("0% - 3% 为健康极佳 good", () => {
    expect(getLossTier(0)).toBe("good");
    expect(getLossTier(2.5)).toBe("good");
    expect(getLossTier(3.0)).toBe("good");
    expect(getLossTier(null)).toBe("good");
    expect(getLossTier(undefined)).toBe("good");
  });

  it("3% - 15% 为轻度波动 warning", () => {
    expect(getLossTier(3.1)).toBe("warning");
    expect(getLossTier(8.0)).toBe("warning");
    expect(getLossTier(15.0)).toBe("warning");
  });

  it("> 15% 为严重拥塞 error", () => {
    expect(getLossTier(15.1)).toBe("error");
    expect(getLossTier(30.0)).toBe("error");
    expect(getLossTier(100)).toBe("error");
  });
});

describe("calculateCarrierLoss", () => {
  it("当未启用多线模式时返回待机状态", () => {
    const res = calculateCarrierLoss(new Map(), new Map(), undefined, false);
    expect(res.isMultiPingMode).toBe(false);
    expect(res.hasAnyData).toBe(false);
    expect(res.peakLoss).toBeNull();
    expect(res.avgLoss).toBeNull();
    expect(res.ct.loss).toBeNull();
    expect(res.cu.loss).toBeNull();
    expect(res.cm.loss).toBeNull();
  });

  it("当无数据时返回缺省默认结构", () => {
    const res = calculateCarrierLoss(new Map(), new Map());
    expect(res.isMultiPingMode).toBe(true);
    expect(res.hasAnyData).toBe(false);
    expect(res.peakLoss).toBeNull();
    expect(res.avgLoss).toBeNull();
    expect(res.ct.loss).toBeNull();
    expect(res.cu.loss).toBeNull();
    expect(res.cm.loss).toBeNull();
  });

  it("正确聚合电信、联通、移动的丢包率与计算峰值", () => {
    const multiLines = new Map<string, HomepagePingLine[]>();
    multiLines.set("node-1", [
      {
        client: "node-1",
        isAssigned: true,
        taskId: 1,
        taskName: "电信CN2",
        loss: 1.5,
        lastValue: 40,
        samples: [],
        max: 50,
      },
      {
        client: "node-1",
        isAssigned: true,
        taskId: 2,
        taskName: "联通9929",
        loss: 0,
        lastValue: 50,
        samples: [],
        max: 60,
      },
      {
        client: "node-1",
        isAssigned: true,
        taskId: 3,
        taskName: "移动CMI",
        loss: 5.0,
        lastValue: 35,
        samples: [],
        max: 45,
      },
    ]);

    const res = calculateCarrierLoss(multiLines, new Map(), ["node-1"]);
    expect(res.hasAnyData).toBe(true);
    expect(res.ct.loss).toBe(1.5);
    expect(res.cu.loss).toBe(0);
    expect(res.cm.loss).toBe(5.0);
    expect(res.peakLoss).toBe(5.0);
    expect(res.avgLoss).toBe(2.2);
  });
});

import { sortNodesByWeight } from "@/pages/ThemeManage/components/CarrierLossConfigModal";
import type { NodeInfo } from "@/types/komari";

describe("sortNodesByWeight", () => {
  it("严格按后台设置的 weight 权重升序排列，相同 weight 按名称排序", () => {
    const rawNodes = [
      { uuid: "3", name: "首尔", weight: 30 } as NodeInfo,
      { uuid: "1", name: "香港 CN2", weight: 10 } as NodeInfo,
      { uuid: "2b", name: "东京 B", weight: 20 } as NodeInfo,
      { uuid: "2a", name: "东京 A", weight: 20 } as NodeInfo,
      { uuid: "0", name: "默认节点", weight: 0 } as NodeInfo,
    ];

    const sorted = sortNodesByWeight(rawNodes);
    expect(sorted.map((n) => n.uuid)).toEqual(["0", "1", "2a", "2b", "3"]);
  });
});
