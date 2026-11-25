import type { ComponentType, SVGProps } from "react";
import { SaoRadarIcon } from "./icons/SaoRadarIcon";
import { HeartbeatIcon } from "./icons/HeartbeatIcon";
import { SkullIcon } from "./icons/SkullIcon";
import { BroadcastIcon } from "./icons/BroadcastIcon";
import { CloverIcon } from "./icons/CloverIcon";
import { Ghost3Icon } from "./icons/Ghost3Icon";
import { GooglePodcastsIcon } from "./icons/GooglePodcastsIcon";
import { DiaperIcon } from "./icons/DiaperIcon";
import { SoundcloudIcon } from "./icons/SoundcloudIcon";
import { HandLittleFingerIcon } from "./icons/HandLittleFingerIcon";

export type SiteBrandIconId =
  | "sao-radar"
  | "heartbeat"
  | "skull"
  | "broadcast"
  | "clover"
  | "ghost-3"
  | "brand-google-podcasts"
  | "diaper"
  | "brand-soundcloud"
  | "hand-little-finger";

export const DEFAULT_SITE_BRAND_ICON: SiteBrandIconId = "sao-radar";

export interface SiteBrandIconOption {
  id: SiteBrandIconId;
  name: string;
  enName: string;
  desc: string;
  component: ComponentType<SVGProps<SVGSVGElement>>;
}

export const SITE_BRAND_ICON_OPTIONS: readonly SiteBrandIconOption[] = [
  {
    id: "sao-radar",
    name: "SAO 雷达",
    enName: "sao-radar",
    desc: "经典 SAO 雷达扫描同心圆，科技探索与锁定目标",
    component: SaoRadarIcon,
  },
  {
    id: "heartbeat",
    name: "心跳脉冲",
    enName: "heartbeat",
    desc: "医疗级心跳生命线，守护集群心跳与健康",
    component: HeartbeatIcon,
  },
  {
    id: "skull",
    name: "暗黑骷髅",
    enName: "skull",
    desc: "神秘酷炫的暗影骷髅，赛博朋克与硬核极客标志",
    component: SkullIcon,
  },
  {
    id: "broadcast",
    name: "天线广播",
    enName: "broadcast",
    desc: "向全网辐射发射的无线电波，实时同步监控信号",
    component: BroadcastIcon,
  },
  {
    id: "clover",
    name: "幸运四叶草",
    enName: "clover",
    desc: "象征好运与常青的四叶草，祈愿服务器 100% SLA",
    component: CloverIcon,
  },
  {
    id: "ghost-3",
    name: "调皮幽灵",
    enName: "ghost-3",
    desc: "俏皮灵动的小幽灵，像后台守护进程般悄然巡逻",
    component: Ghost3Icon,
  },
  {
    id: "brand-google-podcasts",
    name: "声波频率",
    enName: "podcasts",
    desc: "上下起伏的均衡器频段，象征跳动的数据吞吐流水",
    component: GooglePodcastsIcon,
  },
  {
    id: "diaper",
    name: "治愈襁褓",
    enName: "diaper",
    desc: "软萌治愈的襁褓，温柔呵护每一台小鸡服务器",
    component: DiaperIcon,
  },
  {
    id: "brand-soundcloud",
    name: "云端声浪",
    enName: "soundcloud",
    desc: "声浪与云朵的交融，云计算时代的极客韵律",
    component: SoundcloudIcon,
  },
  {
    id: "hand-little-finger",
    name: "拉勾之誓",
    enName: "promise",
    desc: "纯真执着的小拇指拉勾之约，永不掉线的约定",
    component: HandLittleFingerIcon,
  },
] as const;

export const SITE_BRAND_ICON_MAP = new Map<SiteBrandIconId, SiteBrandIconOption>(
  SITE_BRAND_ICON_OPTIONS.map((opt) => [opt.id, opt]),
);

export function isSiteBrandIconId(val: unknown): val is SiteBrandIconId {
  return typeof val === "string" && SITE_BRAND_ICON_MAP.has(val as SiteBrandIconId);
}

export function getBrandIconComponent(id?: string): ComponentType<SVGProps<SVGSVGElement>> {
  if (id && isSiteBrandIconId(id)) {
    return SITE_BRAND_ICON_MAP.get(id)!.component;
  }
  return SaoRadarIcon;
}

export const SITE_BRAND_ICON_STORAGE_KEY = "komaritheme:brand_icon";

export function readStoredSiteBrandIcon(): SiteBrandIconId | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SITE_BRAND_ICON_STORAGE_KEY);
    return isSiteBrandIconId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function persistSiteBrandIcon(icon: SiteBrandIconId) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SITE_BRAND_ICON_STORAGE_KEY, icon);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sao:brand-icon-change", { detail: icon }));
    }
  } catch {}
}
