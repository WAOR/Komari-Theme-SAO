import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getYesterdayTimeWindow,
  calculateNodeNetworkScore,
  getYesterdayBestDisplayCache,
  setYesterdayBestDisplayCache,
  clearYesterdayBestDisplayCache,
  getYesterdayLeaderboardCache,
  setYesterdayLeaderboardCache,
  calculateYesterdayAverageScore,
} from "../yesterdayBestNode";

describe("yesterdayBestNode utils", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    vi.stubGlobal("window", { localStorage: localStorageMock });
    vi.stubGlobal("localStorage", localStorageMock);
  });

  it("calculates window date string accurately", () => {
    // 假设当前时间是 2026-11-08 14:30:00 (本地时间)
    const fixedNow = new Date(2026, 10, 8, 14, 30, 0).getTime();
    const windowInfo = getYesterdayTimeWindow(fixedNow);

    expect(windowInfo.yesterdayDateStr).toBe("2026-11-08");
  });

  it("calculates network performance score based on pure stability (loss, jitter CV, spike ratio)", () => {
    // 1. 亚太节点（低延迟 20ms）完美平稳零丢包：100 分
    const scoreApacPerfect = calculateNodeNetworkScore({
      loss: 0,
      avg: 20,
      stddev: 0.8, // CV = 0.04 <= 0.05
      p50: 20,
      p99: 22, // ratio = 1.1 <= 1.15
    });
    expect(scoreApacPerfect).toBe(100);

    // 2. 美西节点（高延迟 160ms）同样完美平稳零丢包：同样是 100 分满分，排除物理距离歧视
    const scoreUsPerfect = calculateNodeNetworkScore({
      loss: 0,
      avg: 160,
      stddev: 6.4, // CV = 0.04 <= 0.05
      p50: 160,
      p99: 176, // ratio = 1.1 <= 1.15
    });
    expect(scoreUsPerfect).toBe(100);

    // 3. 轻微公网自然抖动与丢包 0.5%：仅扣 2 分，得分 98 分（仍属于极优）
    const scoreLightLoss = calculateNodeNetworkScore({
      loss: 0.5,
      avg: 20,
      stddev: 0.5,
      p50: 20,
      p99: 22,
    });
    expect(scoreLightLoss).toBe(98);

    // 4. 普通公网中度丢包 5%：处于良好区间，得分 ~86 分，不再像旧算法一样腰斩
    const scoreModerateLoss = calculateNodeNetworkScore({
      loss: 5,
      avg: 20,
      stddev: 0.5,
      p50: 20,
      p99: 22,
    });
    expect(scoreModerateLoss).toBe(86);

    // 5. 严重丢包 30%：扣满 50 分
    const scoreSevereLoss = calculateNodeNetworkScore({
      loss: 30,
      avg: 20,
      stddev: 0.5,
      p50: 20,
      p99: 22,
    });
    expect(scoreSevereLoss).toBe(50);

    // 6. 核心公平性裁决（彻底消除高延迟大分母保护伞）：
    // US·Pro-VMS（CN2 GIA/9929/CMIN2 直连优化，156ms，平直极稳，stddev=3.2ms，p99=175ms，loss=0%）
    const scoreProVms = calculateNodeNetworkScore({
      loss: 0,
      avg: 156,
      stddev: 3.2,
      p50: 156,
      p99: 175,
    });

    // US·Max-NTT（联通绕路 231ms，全天锯齿剧烈颠簸，stddev=15.8ms，p99=268ms，移动丢包 0.5%）
    const scoreMaxNtt = calculateNodeNetworkScore({
      loss: 0.5,
      avg: 231,
      stddev: 15.8,
      p50: 230,
      p99: 268,
    });

    // 科学断言：平直平稳的精品优化线路（US·Pro-VMS）必须显著高于绕路心电图抖动线路（US·Max-NTT）
    expect(scoreProVms).toBeGreaterThan(scoreMaxNtt);
    expect(scoreProVms).toBeGreaterThanOrEqual(98.0);
    expect(scoreMaxNtt).toBeLessThan(94.0);
  });

  it("persists display cache for 0ms initial render with safe validation", () => {
    const fixedNow = new Date(2026, 10, 8, 14, 30, 0).getTime();
    const display = {
      nodeIndexText: "#1",
      nodeName: "US•Pro-VMR",
      score: 99.9,
      avgLatency: 28.4,
      avgLoss: 0,
    };

    setYesterdayBestDisplayCache(display, ["uuid-1", "uuid-2"], "tri", fixedNow);
    const cached = getYesterdayBestDisplayCache(["uuid-1", "uuid-2"], "tri", fixedNow);
    expect(cached).not.toBeNull();
    expect(cached?.nodeIndexText).toBe("#1");
    expect(cached?.nodeName).toBe("US•Pro-VMR");
    expect(cached?.score).toBe(99.9);

    clearYesterdayBestDisplayCache();
    expect(getYesterdayBestDisplayCache(["uuid-1", "uuid-2"], "tri", fixedNow)).toBeNull();
  });

  it("safely restores leaderboard cache from localStorage", () => {
    const fixedNow = new Date(2026, 10, 8, 14, 30, 0).getTime();
    const leaderboard = [
      {
        date: "2026-11-08",
        uuid: "uuid-1",
        score: 99.9,
        avgLatency: 28.4,
        avgLoss: 0,
        cv: 0.02,
        spikeRatio: 1.05,
        sampleCount: 1440,
        rank: 1,
      },
    ];

    setYesterdayLeaderboardCache(leaderboard, "tri", fixedNow);
    const cached = getYesterdayLeaderboardCache("tri", fixedNow);
    expect(cached).toHaveLength(1);
    expect(cached?.[0].uuid).toBe("uuid-1");
    expect(cached?.[0].rank).toBe(1);
  });

  it("safely ignores malformed or corrupt cache without crashing", () => {
    const fixedNow = new Date(2026, 10, 8, 14, 30, 0).getTime();
    store["komaritheme:yesterday-best-display:tri"] = JSON.stringify({
      date: "2026-11-08",
      score: "not-a-number", // 脏数据
      nodeName: null,
    });

    const cached = getYesterdayBestDisplayCache(["uuid-1"], "tri", fixedNow);
    expect(cached).toBeNull();
  });

  it("cleans up any legacy localStorage caches when clearYesterdayBestDisplayCache is invoked", () => {
    store["komaritheme:yesterday-best-display"] = "legacy";
    store["komaritheme:yesterday-best-display:tri"] = "legacy-tri";
    store["komaritheme:yesterday-leaderboard:tri"] = "legacy-lb";

    clearYesterdayBestDisplayCache();

    expect(store["komaritheme:yesterday-best-display"]).toBeUndefined();
    expect(store["komaritheme:yesterday-best-display:tri"]).toBeUndefined();
    expect(store["komaritheme:yesterday-leaderboard:tri"]).toBeUndefined();
  });

  it("calculates cluster average score accurately for baseline overview", () => {
    const mockBoard = [
      {
        uuid: "node-1",
        date: "2026-11-08",
        score: 99.0,
        avgLatency: 20,
        avgLoss: 0,
        cv: 0.02,
        spikeRatio: 1.05,
        sampleCount: 1440,
        rank: 1,
        isQualified: true,
      },
      {
        uuid: "node-2",
        date: "2026-11-08",
        score: 95.0,
        avgLatency: 30,
        avgLoss: 0.2,
        cv: 0.04,
        spikeRatio: 1.1,
        sampleCount: 1440,
        rank: 2,
        isQualified: true,
      },
      {
        uuid: "node-3",
        date: "2026-11-08",
        score: 82.0,
        avgLatency: 70,
        avgLoss: 1.6,
        cv: 0.1,
        spikeRatio: 1.3,
        sampleCount: 1440,
        rank: 3,
        isQualified: true,
      },
    ];

    const avgResult = calculateYesterdayAverageScore(mockBoard);
    expect(avgResult).not.toBeNull();
    // (99 + 95 + 82) / 3 = 276 / 3 = 92.0
    expect(avgResult?.score).toBe(92.0);
    // (20 + 30 + 70) / 3 = 40.0
    expect(avgResult?.avgLatency).toBe(40.0);
    // (0 + 0.2 + 1.6) / 3 = 0.6
    expect(avgResult?.avgLoss).toBe(0.6);
    expect(avgResult?.nodeCount).toBe(3);
    expect(avgResult?.qualifiedCount).toBe(3);
  });
});

