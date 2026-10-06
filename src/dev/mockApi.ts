import type { NodeInfo } from "@/types/komari";

const GIB = 1024 ** 3;
const TIB = 1024 ** 4;
const MIB = 1024 ** 2;

function dateAfter(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const BASE_NODES: NodeInfo[] = [
  {
    uuid: "tokyo-edge-01",
    name: "Tokyo Edge",
    group: "生产",
    region: "JP",
    hidden: false,
    cpu_name: "AMD EPYC 7B13",
    cpu_cores: 4,
    arch: "x86_64",
    virtualization: "KVM",
    os: "debian",
    kernel_version: "6.1.0",
    gpu_name: "",
    mem_total: 8 * GIB,
    swap_total: 2 * GIB,
    disk_total: 160 * GIB,
    weight: 10,
    price: 48,
    billing_cycle: "month",
    auto_renewal: true,
    currency: "CNY",
    expired_at: dateAfter(24),
    tags: "边缘<Cyan>; 高带宽<Teal>; 优选<Ruby>",
    public_remark: "东京入口与静态资源",
    traffic_limit: 4 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.11",
    ipv6: "2001:db8::11",
    created_at: dateAfter(-420),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "singapore-api-01",
    name: "Singapore API",
    group: "生产",
    region: "SG",
    hidden: false,
    cpu_name: "Intel Xeon Gold 6338",
    cpu_cores: 8,
    arch: "x86_64",
    virtualization: "KVM",
    os: "ubuntu",
    kernel_version: "6.8.0",
    gpu_name: "",
    mem_total: 16 * GIB,
    swap_total: 4 * GIB,
    disk_total: 240 * GIB,
    weight: 20,
    price: 18,
    billing_cycle: "month",
    auto_renewal: true,
    currency: "USD",
    expired_at: dateAfter(12),
    tags: "API<Blue>; 核心<Crimson>; 高可用<Jade>",
    public_remark: "东南亚 API 集群",
    traffic_limit: 6 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.21",
    ipv6: "2001:db8::21",
    created_at: dateAfter(-310),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "frankfurt-db-01",
    name: "Frankfurt DB",
    group: "生产",
    region: "DE",
    hidden: false,
    cpu_name: "AMD EPYC 7763",
    cpu_cores: 12,
    arch: "x86_64",
    virtualization: "KVM",
    os: "alma",
    kernel_version: "5.14.0",
    gpu_name: "",
    mem_total: 32 * GIB,
    swap_total: 8 * GIB,
    disk_total: 480 * GIB,
    weight: 30,
    price: 34,
    billing_cycle: "month",
    auto_renewal: false,
    currency: "EUR",
    expired_at: dateAfter(3),
    tags: "数据库<Amber>; 临期<Tomato>; 欧洲<Grass>",
    public_remark: "主数据库副本",
    traffic_limit: 8 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.31",
    ipv6: "2001:db8::31",
    created_at: dateAfter(-260),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "new-york-worker-01",
    name: "New York Worker",
    group: "生产",
    region: "US",
    hidden: false,
    cpu_name: "Intel Xeon Platinum 8370C",
    cpu_cores: 8,
    arch: "x86_64",
    virtualization: "KVM",
    os: "rocky",
    kernel_version: "5.14.0",
    gpu_name: "",
    mem_total: 16 * GIB,
    swap_total: 4 * GIB,
    disk_total: 320 * GIB,
    weight: 40,
    price: 22,
    billing_cycle: "month",
    auto_renewal: true,
    currency: "USD",
    expired_at: dateAfter(46),
    tags: "队列<Pink>; 异步<Lime>; 美东<Sky>",
    public_remark: "北美异步任务",
    traffic_limit: 5 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.41",
    ipv6: "2001:db8::41",
    created_at: dateAfter(-180),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "hong-kong-cache-01",
    name: "Hong Kong Cache",
    group: "边缘",
    region: "HK",
    hidden: false,
    cpu_name: "AMD EPYC 7543P",
    cpu_cores: 4,
    arch: "x86_64",
    virtualization: "KVM",
    os: "alpine",
    kernel_version: "6.6.12",
    gpu_name: "",
    mem_total: 6 * GIB,
    swap_total: 2 * GIB,
    disk_total: 120 * GIB,
    weight: 50,
    price: 68,
    billing_cycle: "quarter",
    auto_renewal: true,
    currency: "CNY",
    expired_at: dateAfter(61),
    tags: "缓存<Gold>; 极速<Mint>; BGP<Plum>; 亚太<Iris>",
    public_remark: "香港缓存层",
    traffic_limit: 3 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.51",
    ipv6: "2001:db8::51",
    created_at: dateAfter(-150),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "sydney-backup-01",
    name: "Sydney Backup",
    group: "备份",
    region: "AU",
    hidden: false,
    cpu_name: "Ampere Altra",
    cpu_cores: 4,
    arch: "aarch64",
    virtualization: "KVM",
    os: "ubuntu",
    kernel_version: "6.8.0",
    gpu_name: "",
    mem_total: 8 * GIB,
    swap_total: 2 * GIB,
    disk_total: 640 * GIB,
    weight: 60,
    price: 14,
    billing_cycle: "month",
    auto_renewal: false,
    currency: "USD",
    expired_at: dateAfter(19),
    tags: "冷备<Bronze>; 归档<Brown>; 离线<Slate>",
    public_remark: "离线备份节点",
    traffic_limit: 2 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.61",
    ipv6: "2001:db8::61",
    created_at: dateAfter(-120),
    updated_at: new Date().toISOString(),
  },
];

function getMockNodes(): NodeInfo[] {
  if (typeof window === "undefined") return BASE_NODES;
  const params = new URLSearchParams(window.location.search);
  let sessionNodes = 0;
  try {
    sessionNodes = Number(window.sessionStorage?.getItem("komari_dev_nodes")) || 0;
  } catch {}
  const targetCount = Number(params.get("nodes")) || sessionNodes;
  if (!targetCount || targetCount <= BASE_NODES.length) {
    return BASE_NODES;
  }

  // 如果用户指定了像 ?mock=1&nodes=60 或 100，自动扩充复制
  const result: NodeInfo[] = [...BASE_NODES];
  let i = BASE_NODES.length;
  while (result.length < targetCount) {
    const template = BASE_NODES[i % BASE_NODES.length]!;
    const copyIndex = Math.floor(i / BASE_NODES.length) + 1;
    result.push({
      ...template,
      uuid: `${template.uuid}-sub-${copyIndex}`,
      name: `${template.name} #${copyIndex}`,
      weight: template.weight + i * 5,
      ipv4: `203.0.113.${(10 + i) % 250}`,
      ipv6: `2001:db8::${(10 + i).toString(16)}`,
    });
    i++;
  }
  return result;
}

const nodes: NodeInfo[] = getMockNodes();

function wave(seed: number, period: number, amplitude: number, offset: number) {
  return offset + Math.sin((Date.now() / period) * (1 + seed * 0.17)) * amplitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getNodeStatusProfile(index: number, node: NodeInfo) {
  // 保持约 6-7% 离线
  const isOffline = index % 15 === 5;
  const isHighLoad = !isOffline && index % 9 === 2;

  if (isOffline) {
    return [0, 0, 0, 38, 232, 0, 0, 1.1 * TIB, 880 * GIB, false] as const;
  }

  const cpu = isHighLoad
    ? Math.round(clamp(wave(index, 14_000, 8, 88), 75, 98))
    : Math.round(clamp(wave(index, 24_000, 25, 42), 5, 75));

  const load = +(cpu * 0.08 * (node.cpu_cores || 4) / 4).toFixed(2);
  const swapPct = isHighLoad ? 35 : Math.round(clamp(wave(index, 30_000, 10, 12), 0, 40));
  const diskPct = Math.round(clamp(30 + (index % 7) * 9, 10, 92));

  // Ping 延迟根据地区产生拟真基准延迟
  const region = (node.region || "").toUpperCase();
  let basePing = 36;
  if (region === "HK" || region === "TW" || region === "SG" || region === "JP") {
    basePing = 24 + (index % 4) * 14;
  } else if (region === "US" || region === "CA") {
    basePing = 135 + (index % 3) * 8;
  } else if (region === "DE" || region === "GB" || region === "FR" || region === "CH") {
    basePing = 175 + (index % 3) * 7;
  } else if (region === "AU" || region === "KR") {
    basePing = 215 + (index % 3) * 16;
  } else {
    basePing = 50 + (index % 5) * 30;
  }

  // 吞吐阶梯：在方格矩阵呈现不同梯级（>10MB/s 梯级3、>2MB/s 梯级2、>200KB/s 梯级1、空闲）
  const speedTier = index % 4;
  let upRate = 50_000;
  let downRate = 120_000;
  if (speedTier === 3) {
    upRate = Math.round(clamp(wave(index, 9_000, 4_000_000, 12_000_000), 8_000_000, 35_000_000));
    downRate = Math.round(clamp(wave(index + 2, 11_000, 6_000_000, 18_000_000), 10_000_000, 50_000_000));
  } else if (speedTier === 2) {
    upRate = Math.round(clamp(wave(index, 12_000, 1_000_000, 3_500_000), 2_100_000, 6_000_000));
    downRate = Math.round(clamp(wave(index + 1, 14_000, 1_500_000, 4_800_000), 2_200_000, 8_000_000));
  } else if (speedTier === 1) {
    upRate = Math.round(clamp(wave(index, 15_000, 200_000, 450_000), 220_000, 800_000));
    downRate = Math.round(clamp(wave(index + 3, 17_000, 300_000, 750_000), 250_000, 1_200_000));
  } else {
    upRate = Math.round(clamp(wave(index, 20_000, 40_000, 60_000), 5_000, 120_000));
    downRate = Math.round(clamp(wave(index + 1, 22_000, 60_000, 90_000), 8_000, 160_000));
  }

  const totalUp = (800 + index * 120) * GIB;
  const totalDown = (1200 + index * 180) * GIB;

  return [cpu, load, swapPct, diskPct, basePing, upRate, downRate, totalUp, totalDown, true] as const;
}

function latestStatus() {
  const now = Date.now();
  return Object.fromEntries(
    nodes.map((node, index) => {
      const [cpu, load, swapPct, diskPct, , up, down, totalUp, totalDown, online] =
        getNodeStatusProfile(index, node);
      if (!online) return [node.uuid, { online: false }];
      const memoryPct = index % 9 === 2 ? 88 : 36 + (index % 6) * 7;
      return [
        node.uuid,
        {
          online: true,
          cpu,
          ram: (node.mem_total * memoryPct) / 100,
          ram_total: node.mem_total,
          swap: (node.swap_total * swapPct) / 100,
          swap_total: node.swap_total,
          load,
          load5: +(load * 0.86).toFixed(2),
          load15: +(load * 0.72).toFixed(2),
          disk: (node.disk_total * diskPct) / 100,
          disk_total: node.disk_total,
          net_out: up,
          net_in: down,
          net_total_up: totalUp,
          net_total_down: totalDown,
          uptime: (index + 3) * 864_000,
          process: 96 + (index % 10) * 21,
          connections: 180 + (index % 10) * 44,
          connections_udp: 12 + (index % 10) * 3,
          updated_at: now,
        },
      ];
    }),
  );
}

function loadRecords(uuid: string) {
  const node = nodes.find((item) => item.uuid === uuid) ?? nodes[0];
  const index = Math.max(0, nodes.indexOf(node));
  const profile = getNodeStatusProfile(index, node);
  const now = Date.now();
  return Array.from({ length: 72 }, (_, sample) => {
    const phase = sample / 7 + index;
    const cpu = Math.max(2, Math.min(98, profile[0] + Math.sin(phase) * 10));
    const ram = node.mem_total * Math.min(0.94, 0.35 + (index % 6) * 0.08 + Math.cos(phase) * 0.04);
    return {
      cpu,
      gpu: 0,
      ram,
      ram_total: node.mem_total,
      swap: node.swap_total * 0.08,
      swap_total: node.swap_total,
      load: +(profile[1] + Math.sin(phase) * 0.8).toFixed(2),
      temp: 48 + (index % 6) * 4 + Math.sin(phase) * 3,
      disk: node.disk_total * (profile[3] / 100),
      disk_total: node.disk_total,
      net_in: Math.max(0, profile[6] * (0.7 + Math.sin(phase) * 0.24)),
      net_out: Math.max(0, profile[5] * (0.7 + Math.cos(phase) * 0.24)),
      net_total_up: Math.max(0, profile[7] - (71 - sample) * (12 + (index % 6) * 3) * MIB),
      net_total_down: Math.max(0, profile[8] - (71 - sample) * (28 + (index % 6) * 5) * MIB),
      process: 100 + (index % 10) * 20,
      connections: 180 + (index % 10) * 40,
      connections_udp: 16,
      time: now - (71 - sample) * 300_000,
      client: node.uuid,
    };
  });
}

function trafficMetricPayload(params: {
  metric_keys?: string[];
  entity_ids?: string[];
  start?: string;
  end?: string;
}) {
  const start = Number.isFinite(Date.parse(params.start ?? ""))
    ? Date.parse(params.start ?? "")
    : new Date().setHours(0, 0, 0, 0);
  const end = Number.isFinite(Date.parse(params.end ?? ""))
    ? Date.parse(params.end ?? "")
    : Date.now();
  const entityIds = params.entity_ids?.length ? params.entity_ids : nodes.map((node) => node.uuid);
  const metricKeys = params.metric_keys ?? [];
  const intervalMs = 5 * 60 * 1000;
  const pointCount = Math.max(1, Math.ceil((end - start) / intervalMs));
  const series = entityIds.flatMap((uuid) => {
    const index = nodes.findIndex((node) => node.uuid === uuid);
    if (index < 0) return [];
    const profile = getNodeStatusProfile(index, nodes[index]);
    if (!profile[9]) return [];
    return metricKeys.map((metricKey) => ({
      metric_key: metricKey,
      entity_id: uuid,
      interval_seconds: intervalMs / 1000,
      points: Array.from({ length: pointCount }, (_, pointIndex) => {
        const phase = pointIndex / 9 + index * 0.8;
        const time = new Date(start + pointIndex * intervalMs).toISOString();
        const value =
          metricKey === "traffic.up"
            ? (12 + (index % 6) * 3) * MIB * (0.72 + Math.sin(phase) * 0.24)
            : metricKey === "traffic.down"
              ? (28 + (index % 6) * 5) * MIB * (0.74 + Math.cos(phase) * 0.22)
              : metricKey === "net.out.rate"
                ? profile[5] * (0.62 + Math.sin(phase) * 0.34)
                : profile[6] * (0.66 + Math.cos(phase) * 0.3);
        return { time, value: Math.max(0, value), count: 1 };
      }),
    }));
  });
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    series,
    count: series.length,
  };
}

// queryMetrics 的 ping 路径:latency/loss 双序列,tags 携带 task_id;丢包桶 latency 为
// null、loss 为 1,与真实后端聚合语义一致(mergePingMetricSeries 会还原成 -1 记录)。
function pingMetricPayload(params: {
  metric_keys?: string[];
  entity_ids?: string[];
  hours?: number;
  tags?: { task_id?: string };
}) {
  const end = Date.now();
  const hours = typeof params.hours === "number" && params.hours > 0 ? params.hours : 6;
  const intervalMs = 60_000;
  const pointCount = Math.min(360, Math.max(12, Math.round((hours * 3_600_000) / intervalMs)));
  const start = end - pointCount * intervalMs;
  const entityIds = params.entity_ids?.length ? params.entity_ids : nodes.map((node) => node.uuid);
  const requestedTask = Number(params.tags?.task_id);
  const tasks =
    Number.isFinite(requestedTask) && requestedTask > 0
      ? pingTasks.filter((task) => task.id === requestedTask)
      : pingTasks;
  const metricKeys = (params.metric_keys ?? []).filter((key) => key.startsWith("ping."));
  const series = entityIds.flatMap((uuid) => {
    const index = nodes.findIndex((node) => node.uuid === uuid);
    if (index < 0) return [];
    const profile = getNodeStatusProfile(index, nodes[index]);
    return tasks.flatMap((task) =>
      metricKeys.map((metricKey) => ({
        metric_key: metricKey,
        entity_id: uuid,
        tags: { task_id: String(task.id) },
        interval_seconds: intervalMs / 1000,
        points: Array.from({ length: pointCount }, (_, pointIndex) => {
          const time = new Date(start + (pointIndex + 1) * intervalMs).toISOString();
          const lost = !profile[9] || (index % 11 === 0 && pointIndex % 17 === 0);
          if (metricKey === "ping.loss") {
            return { time, value: lost ? 1 : 0, count: 1 };
          }
          const baseline = profile[4] + (task.id - 1) * 18;
          return {
            time,
            value: lost
              ? null
              : Math.max(1, baseline + Math.round(Math.sin(pointIndex / 5 + index) * 9)),
            count: 1,
          };
        }),
      })),
    );
  });
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    series,
    count: series.length,
  };
}

// queryMetrics 的负载路径:直接把 loadRecords 的字段转成对应 metric 序列。
const LOAD_METRIC_RECORD_FIELD = {
  "cpu.usage": "cpu",
  "memory.used": "ram",
  "swap.used": "swap",
  "load.average": "load",
  "disk.used": "disk",
  "net.in.rate": "net_in",
  "net.out.rate": "net_out",
  "net.total.up": "net_total_up",
  "net.total.down": "net_total_down",
  "process.count": "process",
  "connections.tcp": "connections",
  "connections.udp": "connections_udp",
} as const;

function loadMetricPayload(params: { metric_keys?: string[]; entity_ids?: string[] }) {
  const entityIds = params.entity_ids?.length ? params.entity_ids : [nodes[0].uuid];
  const metricKeys = (params.metric_keys ?? []).filter(
    (key): key is keyof typeof LOAD_METRIC_RECORD_FIELD => key in LOAD_METRIC_RECORD_FIELD,
  );
  const series = entityIds.flatMap((uuid) => {
    const records = loadRecords(uuid);
    return metricKeys.map((metricKey) => ({
      metric_key: metricKey,
      entity_id: uuid,
      interval_seconds: 300,
      points: records.map((record) => ({
        time: new Date(record.time).toISOString(),
        value: record[LOAD_METRIC_RECORD_FIELD[metricKey]],
        count: 1,
      })),
    }));
  });
  const now = Date.now();
  return {
    start: new Date(now - 72 * 300_000).toISOString(),
    end: new Date(now).toISOString(),
    series,
    count: series.length,
  };
}

function pingRecords(uuid?: string, taskId = 1) {
  const clients = uuid ? [uuid] : nodes.map((node) => node.uuid);
  const now = Date.now();
  return clients.flatMap((client) => {
    const index = Math.max(0, nodes.findIndex((node) => node.uuid === client));
    const profile = getNodeStatusProfile(index, nodes[index] ?? nodes[0]);
    const baseline = profile[4] + (taskId - 1) * 18;
    return Array.from({ length: 60 }, (_, sample) => ({
      task_id: taskId,
      time: now - (59 - sample) * 60_000,
      value:
        !profile[9] || (index % 11 === 0 && sample % 17 === 0)
          ? -1
          : Math.max(1, baseline + Math.round(Math.sin(sample / 5 + index) * 9)),
      client,
    }));
  });
}

const pingTasks = [
  { id: 1, name: "中国电信", target: "电信探针" },
  { id: 2, name: "中国联通", target: "联通探针" },
  { id: 3, name: "中国移动", target: "移动探针" },
].map((task, index) => ({
  ...task,
  interval: 60,
  loss: 0,
  clients: nodes.map((node) => node.uuid),
  type: "icmp",
  weight: index + 1,
}));

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export function installDevMockApi() {
  const nativeFetch = window.fetch.bind(window);
  // ?mock=1 默认模拟已登录管理员,放开 /api/admin/*,ThemeManage 才可在 dev 正常保存。显式 ?admin=0 模拟未授权。
  const adminMode = new URLSearchParams(window.location.search).get("admin") !== "0";
  // 保存后的主题设置驻留内存与本地存储，让「保存 → /api/public refetch」以及刷新页面闭环。
  const defaultTheme = "SAO";
  const MOCK_STORAGE_KEY = "komari_mock_theme_settings";
  const defaultMockThemeSettings: Record<string, unknown> = {
    desktopNodeViewMode: "compact",
    mobileNodeViewMode: "compact",
    clusterOverviewMode: "classic",
    showHomeOverview: true,
    showGroupTabs: true,
    showRegionBar: true,
    showCardGroup: true,
    enableHomeSort: true,
    showTrafficPageButton: true,
    showCostSummary: true,
    showCostSummaryFloatingButton: true,
    showPriceForGuests: false,
    showOverviewRatings: true,
    showTrafficRating: true,
    showBandwidthRating: true,
    showAssetRating: true,
    showPingChart: true,
    // 单任务刻意和三网首项不同，便于回归验证列表没有误读全局三网数据。
    homepagePingBindings: { "2": nodes.map((node) => node.uuid) },
    enableHomepageMultiPing:
      new URLSearchParams(window.location.search).get("multiPing") === "1",
    homepageMultiPingTaskIds: [1, 2, 3],
  };

  const savedThemeSettings: Record<string, Record<string, unknown>> = {};

  const readPersistedSettings = (): Record<string, unknown> | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {}
    return null;
  };

  const writePersistedSettings = (settings: Record<string, unknown>) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(settings));
      }
    } catch {}
  };

  const initialStored = readPersistedSettings();
  if (initialStored) {
    savedThemeSettings["SAO"] = initialStored;
    savedThemeSettings["komari-theme-sao"] = initialStored;
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url, window.location.origin);

    if (url.hostname === "api.frankfurter.dev") {
      return json([
        { base: "USD", quote: "CNY", rate: 7.18 },
        { base: "USD", quote: "EUR", rate: 0.86 },
        { base: "USD", quote: "JPY", rate: 146.4 },
      ]);
    }

    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
      return nativeFetch(input, init);
    }

    if (url.pathname === "/api/me") {
      return json(
        adminMode
          ? { logged_in: true, username: "mock-admin", uuid: "mock-admin-uuid" }
          : { logged_in: false, username: "", uuid: "" },
      );
    }

    if (url.pathname === "/api/admin/client/list") {
      if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
      return json(
        nodes.map(({ uuid, name, group, region, weight }) => ({
          uuid,
          name,
          group,
          region,
          weight,
        })),
      );
    }

    if (url.pathname === "/api/admin/ping") {
      if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
      return json(pingTasks);
    }

    if (url.pathname === "/api/admin/theme/settings") {
      if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
      const theme = url.searchParams.get("theme") ?? defaultTheme;
      const body = (await request.json()) as Record<string, unknown>;
      savedThemeSettings[theme] = body;
      savedThemeSettings["SAO"] = body;
      savedThemeSettings["komari-theme-sao"] = body;
      writePersistedSettings(body);
      return json({ status: "success" });
    }

    if (url.pathname === "/api/public") {
      const theme = url.searchParams.get("theme") ?? defaultTheme;
      const activeSaved =
        savedThemeSettings[theme] ??
        savedThemeSettings["SAO"] ??
        savedThemeSettings["komari-theme-sao"] ??
        readPersistedSettings();
      return json({
        sitename: "Komari SAO",
        description: "全球节点运行状态",
        theme: "SAO",
        allow_cors: false,
        disable_password_login: false,
        oauth_enable: false,
        private_site: false,
        record_enabled: true,
        record_preserve_time: 30,
        ping_record_preserve_time: 30,
        metric_retention_days: 90,
        custom_head: "",
        custom_body: "",
        theme_settings: activeSaved
          ? { ...defaultMockThemeSettings, ...activeSaved }
          : defaultMockThemeSettings,
      });
    }

    if (url.pathname === "/api/nodes") {
      return json(nodes);
    }

    if (url.pathname === "/api/rpc2") {
      const payload = (await request.json()) as {
        id?: number | string;
        method?: string;
        params?: {
          uuid?: string;
          type?: string;
          task_id?: number;
          hours?: number;
          metric_keys?: string[];
          entity_ids?: string[];
          tags?: { task_id?: string };
          start?: string;
          end?: string;
        };
      };
      const reply = (result: unknown) => json({ jsonrpc: "2.0", id: payload.id, result });
      const methodNotFound = () =>
        json({
          jsonrpc: "2.0",
          id: payload.id,
          error: { code: -32601, message: `Method not found: ${payload.method}` },
        });

      switch (payload.method) {
        case "public:queryMetrics": {
          // 各类 metric key 都要有响应:任何一类返回 Method not found 都会置位全局
          // 降级标志,把其余 metrics 路径一并拖下水(dev 与真实后端行为背离)。
          const metricKeys = payload.params?.metric_keys ?? [];
          if (metricKeys.some((key) => key.startsWith("ping."))) {
            return reply(pingMetricPayload(payload.params ?? {}));
          }
          if (metricKeys.some((key) => key === "traffic.up" || key === "traffic.down")) {
            return reply(trafficMetricPayload(payload.params ?? {}));
          }
          return reply(loadMetricPayload(payload.params ?? {}));
        }
        case "public:getPingMetricStats":
          // 统计接口不实现:api.ts 对它单独 catch 后会用 records 本地计算,足够 dev 用。
          return methodNotFound();
        case "public:getPublicPingTasks":
          return reply(pingTasks);
        case "common:getNodes":
          return reply(Object.fromEntries(nodes.map((node) => [node.uuid, node])));
        case "common:getNodesLatestStatus":
          return reply(latestStatus());
        case "common:getRecords": {
          const isPing = payload.params?.type === "ping";
          const records = isPing
            ? pingRecords(payload.params?.uuid, payload.params?.task_id)
            : loadRecords(payload.params?.uuid ?? nodes[0].uuid);
          return reply({ count: records.length, records, tasks: isPing ? pingTasks : [] });
        }
        default:
          // 未实现的方法返回标准错误,与真实后端一致——空对象伪装成功会让 dev 测不出接口缺失。
          return methodNotFound();
      }
    }

    return json({ message: `No mock for ${url.pathname}` }, { status: 404 });
  };
}
