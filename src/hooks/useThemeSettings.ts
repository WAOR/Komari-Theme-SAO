import { useMemo } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { normalizeThemeSettings, type ResolvedThemeSettings } from "@/utils/themeSettings";

type RawThemeSettings = Parameters<typeof normalizeThemeSettings>[0];

let cachedRawThemeSettings: RawThemeSettings = undefined;
let cachedResolvedThemeSettings: ResolvedThemeSettings | null = null;

// 在模块加载时静默清除历史残留的本地主题设置脏缓存，彻底避免新老版本数据冲突
if (typeof window !== "undefined" && window.localStorage) {
  try {
    window.localStorage.removeItem("komari_theme_settings_cache");
  } catch {}
}

export function readCachedThemeSettings(): RawThemeSettings {
  return undefined;
}

export function writeCachedThemeSettings(_raw: RawThemeSettings) {
  // 保持空实现，不再写入 localStorage，避免跨版本持久化脏数据
}

function getCachedResolvedThemeSettings(raw: RawThemeSettings): ResolvedThemeSettings {
  if (cachedResolvedThemeSettings && raw === cachedRawThemeSettings) {
    return cachedResolvedThemeSettings;
  }
  cachedRawThemeSettings = raw;
  cachedResolvedThemeSettings = normalizeThemeSettings(raw);
  return cachedResolvedThemeSettings;
}

type ThemeSettingsState = ResolvedThemeSettings & {
  /**
   * 服务端 config 到达后为 true。config 请求失败时它也会变 true，
   * 让应用回退到默认值，而不是一直空白。
   */
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
};

export function useThemeSettings(): ThemeSettingsState {
  const { data: config, isError, isLoading } = usePublicConfig();
  const hasConfig = config != null;
  const isReady = hasConfig || isError;
  return useMemo(() => {
    const base = getCachedResolvedThemeSettings(config?.theme_settings);
    let overrideClusterMode: "classic" | "nodes" | undefined;
    let overridePalette: "default" | "eva" | "divergence" | undefined;
    let overrideVisualMode: "adaptive" | "visual" | "text" | undefined;
    let overrideMicroVisual: "dynamic" | "static" | undefined;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const clusterParam = searchParams.get("cluster");
      const matrixParam = searchParams.get("matrix");
      if (clusterParam === "nodes" || matrixParam === "1") {
        overrideClusterMode = "nodes";
      } else if (clusterParam === "classic") {
        overrideClusterMode = "classic";
      }

      const paletteParam = searchParams.get("palette");
      if (paletteParam === "divergence" || paletteParam === "eva" || paletteParam === "default") {
        overridePalette = paletteParam;
      }

      const visualModeParam = searchParams.get("visualMode");
      if (visualModeParam === "adaptive" || visualModeParam === "visual" || visualModeParam === "text") {
        overrideVisualMode = visualModeParam;
      }

      const microVisualParam = searchParams.get("microVisual");
      if (microVisualParam === "dynamic" || microVisualParam === "static") {
        overrideMicroVisual = microVisualParam;
      }
    }
    return {
      ...base,
      ...(overrideClusterMode ? { clusterOverviewMode: overrideClusterMode } : {}),
      ...(overridePalette ? { matrixColorTheme: overridePalette } : {}),
      ...(overrideVisualMode ? { overviewCardVisualMode: overrideVisualMode } : {}),
      ...(overrideMicroVisual ? { overviewMicroVisualMode: overrideMicroVisual } : {}),
      isReady,
      isLoading: isLoading && !hasConfig,
      isError,
    };
  }, [config?.theme_settings, hasConfig, isError, isLoading, isReady]);
}
