// 20 列 × 5 行点阵常量与预设定义

export const GRID_COLUMNS = 20;
export const MIN_RACK_ROWS = 5;
export const TOTAL_PIXELS = GRID_COLUMNS * MIN_RACK_ROWS; // 100

export interface PatternPreset {
  id: string;
  name: string;
  indices: number[];
}

export const PATTERN_PRESETS: Record<string, PatternPreset> = {
  sao: {
    id: "sao",
    name: "SAO",
    indices: [
      // S
      2, 3, 4, 5, 22, 42, 43, 44, 45, 65, 82, 83, 84, 85,
      // A
      8, 9, 10, 27, 31, 47, 48, 49, 50, 51, 67, 71, 87, 91,
      // O
      14, 15, 16, 33, 37, 53, 57, 73, 77, 94, 95, 96,
    ],
  },
  eva: {
    id: "eva",
    name: "EVA",
    indices: [
      // E (cols 2..5)
      2, 3, 4, 5, 22, 42, 43, 44, 45, 62, 82, 83, 84, 85,
      // V (cols 8..12)
      8, 12, 28, 32, 48, 52, 69, 71, 90,
      // A (cols 14..17)
      15, 16, 34, 37, 54, 55, 56, 57, 74, 77, 94, 97,
    ],
  },
  ping: {
    id: "ping",
    name: "PING",
    indices: [
      // P (cols 1..4)
      1, 2, 3, 4, 21, 24, 41, 42, 43, 44, 61, 81,
      // I (cols 6..8)
      6, 7, 8, 27, 47, 67, 86, 87, 88,
      // N (cols 10..13)
      10, 13, 30, 31, 33, 50, 52, 53, 70, 73, 90, 93,
      // G (cols 15..18)
      16, 17, 18, 35, 55, 57, 58, 75, 78, 96, 97, 98,
    ],
  },
  ops: {
    id: "ops",
    name: "OPS",
    indices: [
      // O (cols 2..5)
      2, 3, 4, 5, 22, 25, 42, 45, 62, 65, 82, 83, 84, 85,
      // P (cols 8..11)
      8, 9, 10, 11, 28, 31, 48, 49, 50, 51, 68, 88,
      // S (cols 14..17)
      14, 15, 16, 17, 34, 54, 55, 56, 57, 77, 94, 95, 96, 97,
    ],
  },
  fast: {
    id: "fast",
    name: "FAST",
    indices: [
      // F (cols 1..4)
      1, 2, 3, 4, 21, 41, 42, 43, 61, 81,
      // A (cols 6..9)
      7, 8, 26, 29, 46, 47, 48, 49, 66, 69, 86, 89,
      // S (cols 11..14)
      11, 12, 13, 14, 31, 51, 52, 53, 54, 74, 91, 92, 93, 94,
      // T (cols 16..18)
      16, 17, 18, 37, 57, 77, 97,
    ],
  },
  pulse: {
    id: "pulse",
    name: "〰️ 心电脉冲",
    indices: [
      // R波尖峰巅峰 (col 10)
      10,
      // 陡峭上升与下降沿 (cols 9, 11)
      29, 31,
      // 基线与穿越基线 (cols 0..6, 8, 12, 15..19)
      40, 41, 42, 43, 44, 45, 46, 48, 52, 55, 56, 57, 58, 59,
      // Q波浅探与深下探回弹 (cols 7, 12, 14)
      67, 72, 74,
      // S波深探谷底 (col 13)
      93,
    ],
  },
  pacman: {
    id: "pacman",
    name: "🕹️ 吃豆人",
    indices: [
      // 圆形吃豆人 (cols 1..4, 弧度外轮廓与 60° 大张嘴)
      2, 3, 4,
      21, 22, 23, 24,
      41, 42,
      61, 62, 63, 64,
      82, 83, 84,
      // 能量金豆 (cols 8, 11)
      48, 51,
      // 经典幽灵 Blinky (cols 14..18: 圆顶、双眼、波浪裙摆)
      15, 16, 17,
      34, 36, 38,
      54, 55, 56, 57, 58,
      74, 75, 76, 77, 78,
      94, 96, 98,
    ],
  },
  heart: {
    id: "heart",
    name: "❤️ 爱心",
    indices: [
      7, 8, 11, 12,
      26, 27, 28, 29, 30, 31, 32, 33,
      46, 47, 48, 49, 50, 51, 52, 53,
      67, 68, 69, 70, 71, 72,
      89, 90,
    ],
  },
  code404: {
    id: "code404",
    name: "404",
    indices: [
      // 4
      2, 5, 22, 25, 42, 43, 44, 45, 65, 85,
      // 0
      8, 9, 10, 11, 28, 31, 48, 51, 68, 71, 88, 89, 90, 91,
      // 4
      14, 17, 34, 37, 54, 55, 56, 57, 77, 97,
    ],
  },
};

export const DEFAULT_PATTERN = PATTERN_PRESETS.sao.indices;
export const DEFAULT_PATTERN_SET = new Set<number>(DEFAULT_PATTERN);

import type { UserMatrixPreset } from "@/types/komari";
export type { UserMatrixPreset };

export const USER_PRESETS_STORAGE_KEY = "komari-sao:matrix-user-presets";
const LEGACY_USER_PRESETS_STORAGE_KEY = "cfsm-sao:matrix-user-presets";
export const MAX_USER_PRESETS = 12;

/**
 * 从浏览器 localStorage 加载用户保存的点阵预设列表
 */
export function loadUserMatrixPresets(): UserMatrixPreset[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw =
      localStorage.getItem(USER_PRESETS_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_USER_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is UserMatrixPreset =>
          typeof item?.id === "string" &&
          typeof item?.name === "string" &&
          Array.isArray(item?.indices),
      );
    }
  } catch (err) {
    console.warn("Failed to load user matrix presets:", err);
  }
  return [];
}

/**
 * 保存用户点阵预设列表到浏览器 localStorage
 */
export function saveUserMatrixPresets(presets: UserMatrixPreset[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(
      USER_PRESETS_STORAGE_KEY,
      JSON.stringify(presets.slice(0, MAX_USER_PRESETS)),
    );
  } catch (err) {
    console.warn("Failed to save user matrix presets:", err);
  }
}

/**
 * 根据传入的自定义图案数组解析出最终生效的点阵像素索引 Set
 * - 当传入 null 或 undefined 时，回退到默认 SAO 点阵；
 * - 当传入数组（包括空数组 []，代表清空画布）时，严格尊重用户所选像素集合。
 */
export function getPatternPixelSet(custom?: number[] | null): Set<number> {
  if (Array.isArray(custom)) {
    return new Set(custom);
  }
  return DEFAULT_PATTERN_SET;
}
