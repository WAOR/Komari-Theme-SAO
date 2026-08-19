import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useThemeSettings } from "@/hooks/useThemeSettings";

const PRICE_VISIBILITY_OVERRIDE_KEY = "komaritheme:price-visibility-override";

export type PriceVisibilityOverride = "visible" | "hidden" | null;

const listeners = new Set<() => void>();

export function resolvePriceVisibility(
  loggedIn: boolean,
  showPriceForGuests: boolean,
  override: PriceVisibilityOverride,
): boolean {
  return loggedIn ? override !== "hidden" : showPriceForGuests;
}

function readStoredOverride(): PriceVisibilityOverride {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(PRICE_VISIBILITY_OVERRIDE_KEY);
    if (value === "visible" || value === "hidden") return value;
    return null;
  } catch {
    return null;
  }
}

let currentOverride: PriceVisibilityOverride = readStoredOverride();

function emit() {
  for (const listener of listeners) listener();
}

function writeStoredOverride(value: PriceVisibilityOverride) {
  currentOverride = value;
  try {
    if (value == null) {
      sessionStorage.removeItem(PRICE_VISIBILITY_OVERRIDE_KEY);
    } else {
      sessionStorage.setItem(PRICE_VISIBILITY_OVERRIDE_KEY, value);
    }
  } catch {
    // 忽略 sessionStorage 写入失败
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): PriceVisibilityOverride {
  return currentOverride;
}

export function usePriceVisibility() {
  const { data: me } = useAuth();
  const themeSettings = useThemeSettings();
  const override = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const loggedIn = Boolean(me?.logged_in);

  // 未登录访客：严格跟随后台主题配置项 showPriceForGuests（默认 false 为隐藏）
  // 已登录管理员：默认显示（true），但允许通过快捷开关临时切换显示/隐藏
  const isPriceVisible = loggedIn
    ? override !== "hidden"
    : themeSettings.showPriceForGuests;

  const togglePriceVisibility = useCallback(() => {
    if (!loggedIn) return;
    const next = override === "hidden" ? "visible" : "hidden";
    writeStoredOverride(next);
  }, [loggedIn, override]);

  const setPriceVisible = useCallback(
    (visible: boolean) => {
      if (!loggedIn) return;
      writeStoredOverride(visible ? "visible" : "hidden");
    },
    [loggedIn],
  );

  const resetPriceVisibilityOverride = useCallback(() => {
    writeStoredOverride(null);
  }, []);

  return {
    isPriceVisible,
    canToggle: loggedIn,
    togglePriceVisibility,
    setPriceVisible,
    resetPriceVisibilityOverride,
  };
}
