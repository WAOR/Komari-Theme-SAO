import { useMemo } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { normalizeThemeSettings, type ResolvedThemeSettings } from "@/utils/themeSettings";

type RawThemeSettings = Parameters<typeof normalizeThemeSettings>[0];

let cachedRawThemeSettings: RawThemeSettings = undefined;
let cachedResolvedThemeSettings: ResolvedThemeSettings | null = null;

const THEME_SETTINGS_CACHE_KEY = "komari_theme_settings_cache";

function readCachedThemeSettings(): RawThemeSettings {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored =
        window.localStorage.getItem(THEME_SETTINGS_CACHE_KEY) ||
        window.localStorage.getItem("komari_mock_theme_settings");
      if (stored) {
        return JSON.parse(stored) as RawThemeSettings;
      }
    }
  } catch {}
  return undefined;
}

function writeCachedThemeSettings(raw: RawThemeSettings) {
  try {
    if (typeof window !== "undefined" && window.localStorage && raw) {
      window.localStorage.setItem(THEME_SETTINGS_CACHE_KEY, JSON.stringify(raw));
    }
  } catch {}
}

function getCachedResolvedThemeSettings(raw: RawThemeSettings): ResolvedThemeSettings {
  const effectiveRaw = raw ?? readCachedThemeSettings();
  if (raw) {
    writeCachedThemeSettings(raw);
  }
  if (cachedResolvedThemeSettings && effectiveRaw === cachedRawThemeSettings) {
    return cachedResolvedThemeSettings;
  }
  cachedRawThemeSettings = effectiveRaw;
  cachedResolvedThemeSettings = normalizeThemeSettings(effectiveRaw);
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
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const clusterParam = searchParams.get("cluster");
      const matrixParam = searchParams.get("matrix");
      if (clusterParam === "nodes" || matrixParam === "1") {
        overrideClusterMode = "nodes";
      } else if (clusterParam === "classic") {
        overrideClusterMode = "classic";
      }
    }
    return {
      ...base,
      ...(overrideClusterMode ? { clusterOverviewMode: overrideClusterMode } : {}),
      isReady,
      isLoading: isLoading && !hasConfig,
      isError,
    };
  }, [config?.theme_settings, hasConfig, isError, isLoading, isReady]);
}
