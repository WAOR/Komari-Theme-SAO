import { useEffect, useMemo } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import {
  normalizeThemeSettings,
  readStoredPalette,
  persistPalette,
  readStoredDarkBrandColor,
  persistDarkBrandColor,
  isMatrixColorTheme,
  type ResolvedThemeSettings,
} from "@/utils/themeSettings";
import {
  readStoredSiteBrandIcon,
  persistSiteBrandIcon,
  isSiteBrandIconId,
} from "@/components/brand-icons";

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
  const resolved = normalizeThemeSettings(raw);
  if (!raw && typeof window !== "undefined") {
    const cachedPalette = readStoredPalette();
    if (cachedPalette) {
      resolved.matrixColorTheme = cachedPalette;
    }
    const cachedDarkBrandColor = readStoredDarkBrandColor();
    if (cachedDarkBrandColor !== null) {
      resolved.enableDarkBrandColor = cachedDarkBrandColor;
    }
    const cachedBrandIcon = readStoredSiteBrandIcon();
    if (cachedBrandIcon) {
      resolved.siteBrandIcon = cachedBrandIcon;
    }
  }
  cachedResolvedThemeSettings = resolved;
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
  const rawThemePalette = config?.theme_settings?.matrixColorTheme;

  useEffect(() => {
    if (rawThemePalette && isMatrixColorTheme(rawThemePalette)) {
      persistPalette(rawThemePalette);
      if (typeof document !== "undefined") {
        document.documentElement.dataset.palette = rawThemePalette;
      }
    }
  }, [rawThemePalette]);

  const rawDarkBrandColor = config?.theme_settings?.enableDarkBrandColor;
  useEffect(() => {
    if (typeof rawDarkBrandColor === "boolean") {
      persistDarkBrandColor(rawDarkBrandColor);
    }
  }, [rawDarkBrandColor]);

  const rawBrandIcon = config?.theme_settings?.siteBrandIcon;
  useEffect(() => {
    if (isSiteBrandIconId(rawBrandIcon)) {
      persistSiteBrandIcon(rawBrandIcon);
    }
  }, [rawBrandIcon]);
  return useMemo(() => {
    const base = getCachedResolvedThemeSettings(config?.theme_settings);
    let overrideClusterMode: "classic" | "nodes" | undefined;
    let overrideClusterFlip: boolean | undefined;
    let overridePalette: "default" | "eva" | "divergence" | "aurora" | undefined;
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

      const flipParam = searchParams.get("flip");
      if (flipParam === "0" || flipParam === "false") {
        overrideClusterFlip = false;
      } else if (flipParam === "1" || flipParam === "true") {
        overrideClusterFlip = true;
      }

      const paletteParam = searchParams.get("palette");
      if (paletteParam === "divergence" || paletteParam === "eva" || paletteParam === "default" || paletteParam === "aurora") {
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
      ...(overrideClusterFlip !== undefined ? { enableClusterFlip: overrideClusterFlip } : {}),
      ...(overridePalette ? { matrixColorTheme: overridePalette } : {}),
      ...(overrideVisualMode ? { overviewCardVisualMode: overrideVisualMode } : {}),
      ...(overrideMicroVisual ? { overviewMicroVisualMode: overrideMicroVisual } : {}),
      isReady,
      isLoading: isLoading && !hasConfig,
      isError,
    };
  }, [config?.theme_settings, hasConfig, isError, isLoading, isReady]);
}
