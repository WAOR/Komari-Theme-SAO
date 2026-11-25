import {
  CircleDollarSign,
  HelpCircle,
  ListFilter,
  Moon,
  Server,
  Sliders,
  Sun,
  SunMoon,
  Square,
  LayoutGrid,
  Grid3x3,
  List,
} from "lucide-react";
import type {
  ThemeTabId,
  ColorThemeOption,
  BootEffectOption,
  OverviewVisualModeOption,
} from "./types";
import type { AdminClient } from "@/types/komari";

export const EMPTY_ASSIGNED_CLIENTS: string[] = [];
export const EMPTY_ADMIN_CLIENTS: AdminClient[] = [];
import {
  DEFAULT_PING_LATENCY_COLORS,
  DEFAULT_PING_LOSS_COLORS,
  DEFAULT_TRAFFIC_SPECTRUM_COLORS,
} from "@/utils/themeSettings";
import type { PingOverviewBucket } from "@/types/komari";

export const THEME_TABS: ReadonlyArray<{
  id: ThemeTabId;
  label: string;
  hint: string;
  icon: typeof ListFilter;
}> = [
  { id: "home", label: "总览", hint: "顶部大盘与核心指标卡池", icon: ListFilter },
  { id: "card", label: "服务器", hint: "卡片样式、排序与网络延迟", icon: Server },
  { id: "cost", label: "资产", hint: "费用汇率与二手溢价", icon: CircleDollarSign },
  { id: "other", label: "其他", hint: "访客默认外观与全局设置", icon: Sliders },
  { id: "feedback", label: "帮助", hint: "常见问题与建议反馈", icon: HelpCircle },
];

export const DEFAULT_THEME_TAB: ThemeTabId = "home";

export function isThemeTabId(value: string | null): value is ThemeTabId {
  return value != null && THEME_TABS.some((tab) => tab.id === value);
}

export const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
  {
    id: "default",
    label: "经典标准",
    badge: "CLASSIC",
    desc: "绿 / 橙 / 红 经典监控配色，状态一目了然",
    colors: ["rgba(16, 185, 129, 0.28)", "#22c55e", "#f59e0b", "#ef4444"],
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    id: "eva",
    label: "EVA",
    badge: "NERV",
    desc: "机体紫配荧光绿，经典机甲高对比撞色",
    colors: ["#7c3aed", "#00ff66", "#f97316", "#ef4444"],
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
  },
  {
    id: "divergence",
    label: "命运石之门",
    badge: "1.048596%",
    desc: "复古辉光管暖橙色，温暖护眼耐看",
    colors: ["#fdba74", "#f97316", "#ea580c", "#ef4444"],
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30",
  },
  {
    id: "aurora",
    label: "云雾抹茶",
    badge: "MATCHA",
    desc: "清润抹茶与轻柔云雾漫射，温润雅致通透",
    colors: [
      "#e5f6d7",
      "#82dd2d",
      "#58a021",
      "#dce5da repeating-linear-gradient(135deg, rgba(100, 125, 95, 0.4) 0, rgba(100, 125, 95, 0.4) 1px, transparent 1px, transparent 2.5px)",
    ],
    badgeClass: "bg-lime-500/15 text-lime-600 dark:text-lime-300 border-lime-500/30",
  },
];

export const BOOT_EFFECT_OPTIONS: BootEffectOption[] = [
  {
    id: "laser-scan",
    label: "激光扫描",
    badge: "RADAR",
    desc: "光束从左到右水平扫过，平滑显现卡片",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    id: "digital-rain",
    label: "代码瀑布",
    badge: "CASCADE",
    desc: "像代码雨一样，卡片自上而下逐行倾泻浮现",
    badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
  },
  {
    id: "cyber-glitch",
    label: "数码闪烁",
    badge: "OVERCLOCK",
    desc: "科技感数码噪点快速闪烁后定格",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30",
  },
  {
    id: "divergence-flux",
    label: "数字跳变",
    badge: "1.048596%",
    desc: "像辉光管数字快速滚动跳动后定格",
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30",
  },
];

export const OVERVIEW_VISUAL_MODE_OPTIONS: OverviewVisualModeOption[] = [
  {
    id: "adaptive",
    label: "智能排版",
    desc: "大屏展示完整内容，小屏自动精简防重叠",
  },
  {
    id: "visual",
    label: "纯图模式",
    desc: "只看数值和右侧微图",
  },
  {
    id: "text",
    label: "文字模式",
    desc: "只看数值和辅助文字说明",
  },
];

export const PREVIEW_LATENCY_SAMPLES = [
  15, 25, 40, 55, 65, 80, 95, 110, 130, 150, 165, 185, 195, 210, 260, 320,
];
export const PREVIEW_LOSS_SAMPLES = [
  0, 0, 0, 0, 10, 0, 0, 0, 0, 10, 0, 0, 10, 0, 0, 0,
];

export const PREVIEW_LATENCY_BUCKETS: PingOverviewBucket[] = PREVIEW_LATENCY_SAMPLES.map(
  (value, index) => ({
    index,
    total: 10,
    successful: 10,
    lost: 0,
    loss: 0,
    value,
    startAt: null,
    endAt: null,
  }),
);

export const PREVIEW_LOSS_BUCKETS: PingOverviewBucket[] = PREVIEW_LOSS_SAMPLES.map(
  (loss, index) => ({
    index,
    total: 10,
    successful: Math.round(10 * (1 - loss / 100)),
    lost: Math.round(10 * (loss / 100)),
    loss,
    value: 40,
    startAt: null,
    endAt: null,
  }),
);

export const LATENCY_TIER_CONFIG = [
  { key: "excellent" as const, label: "极好", hint: "极低延迟，最流畅体验", defaultColor: DEFAULT_PING_LATENCY_COLORS.excellent },
  { key: "good" as const, label: "良好", hint: "正常低延迟，无感知波动", defaultColor: DEFAULT_PING_LATENCY_COLORS.good },
  { key: "moderate" as const, label: "中等", hint: "稍有延迟，基本稳定可用", defaultColor: DEFAULT_PING_LATENCY_COLORS.moderate },
  { key: "elevated" as const, label: "偏高", hint: "高延迟警示，网络较吃紧", defaultColor: DEFAULT_PING_LATENCY_COLORS.elevated },
  { key: "critical" as const, label: "极高", hint: "严重延迟，极度拥堵或告警", defaultColor: DEFAULT_PING_LATENCY_COLORS.critical },
] as const;

export const LOSS_TIER_CONFIG = [
  {
    key: "zero" as const,
    label: "正常 (0%)",
    hint: "网络通畅无丢包时的光柱颜色",
    condition: "= 0% (无丢包)",
    defaultColor: DEFAULT_PING_LOSS_COLORS.zero,
  },
  {
    key: "loss" as const,
    label: "丢包 (> 0%)",
    hint: "存在丢包时的光柱颜色（启用斜纹时作为底色）",
    condition: "> 0% (有丢包)",
    defaultColor: DEFAULT_PING_LOSS_COLORS.loss ?? DEFAULT_PING_LOSS_COLORS.low,
  },
] as const;

export const TRAFFIC_SPECTRUM_ANCHOR_CONFIG = [
  {
    key: "start" as const,
    label: "充裕健康色 (0% ~ 15%)",
    stage: "充裕健康期",
    hint: "初始充裕配额，健康充足状态",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.start,
  },
  {
    key: "mid" as const,
    label: "半程消耗色 (~50%)",
    stage: "半程过渡期",
    hint: "中位消耗阶段，稳定过渡",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.mid,
  },
  {
    key: "high" as const,
    label: "高耗预警色 (~80%)",
    stage: "高耗预警期",
    hint: "配额消耗过半，提示关注用量",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.high,
  },
  {
    key: "end" as const,
    label: "危险耗尽色 (~100%)",
    stage: "危险耗尽期",
    hint: "临近或已耗尽，到达上限状态",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.end,
  },
] as const;

export const APPEARANCE_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "system", label: "跟随系统", icon: SunMoon },
  { value: "dark", label: "深色", icon: Moon },
] as const;

export const NODE_VIEW_MODE_OPTIONS = [
  { value: "large", label: "大卡片", icon: Square },
  { value: "compact", label: "小卡片", icon: LayoutGrid },
  { value: "mini", label: "迷你卡片", icon: Grid3x3 },
  { value: "list", label: "列表", icon: List },
] as const;

export const MOBILE_VIEW_MODE_OPTIONS = NODE_VIEW_MODE_OPTIONS.filter((option) => option.value !== "list");

export interface BandwidthTierItem {
  level: 0 | 1 | 2 | 3;
  tierTitle: string;
  threshold: string;
  defaultLabel: string;
  desc: string;
}

export const BANDWIDTH_TIERS: readonly BandwidthTierItem[] = [
  {
    level: 0,
    tierTitle: "一阶 · 闲置",
    threshold: "≤ 1 Mbps",
    defaultLabel: "IDLE",
    desc: "极低吞吐或待机心跳",
  },
  {
    level: 1,
    tierTitle: "二阶 · 轻载",
    threshold: "≤ 10 Mbps",
    defaultLabel: "LIGHT",
    desc: "平稳轻度网络流量",
  },
  {
    level: 2,
    tierTitle: "三阶 · 活跃",
    threshold: "≤ 100 Mbps",
    defaultLabel: "ACTIVE",
    desc: "节点负载持续运转",
  },
  {
    level: 3,
    tierTitle: "四阶 · 激增",
    threshold: "> 100 Mbps",
    defaultLabel: "SURGE",
    desc: "高吞吐或满载跑峰",
  },
] as const;

export const PROJECT_REPOS = [
  {
    id: "komari",
    name: "Komari SAO",
    tag: "Komari",
    repo: "WAOR/Komari-Theme-SAO",
    url: "https://github.com/WAOR/Komari-Theme-SAO",
    issuesUrl: "https://github.com/WAOR/Komari-Theme-SAO/issues",
    newIssueUrl: "https://github.com/WAOR/Komari-Theme-SAO/issues/new",
    desc: "服务于探针数据呈现本身的高自由度模块化主题",
    isCurrent: true,
  },
  {
    id: "monitor",
    name: "Monitor SAO",
    tag: "Monitor 极简探针",
    repo: "WAOR/Monitor-SAO",
    url: "https://github.com/WAOR/Monitor-SAO",
    issuesUrl: "https://github.com/WAOR/Monitor-SAO/issues",
    newIssueUrl: "https://github.com/WAOR/Monitor-SAO/issues/new",
    desc: "服务于探针数据呈现本身的高自由度模块化主题",
    isCurrent: false,
  },
  {
    id: "cfsm",
    name: "CFSM SAO",
    tag: "Cloudflare Server Monitor",
    repo: "WAOR/CFSM-SAO",
    url: "https://github.com/WAOR/CFSM-SAO",
    issuesUrl: "https://github.com/WAOR/CFSM-SAO/issues",
    newIssueUrl: "https://github.com/WAOR/CFSM-SAO/issues/new",
    desc: "服务于探针数据呈现本身的高自由度模块化主题",
    isCurrent: false,
  },
] as const;

export const BODY_BOTTOM_GAP = 2;
export const MIN_BODY_HEIGHT = 320;
