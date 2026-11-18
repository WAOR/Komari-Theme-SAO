import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PublicConfig } from "@/types/komari";
import type {
  NodeInfo,
  PingLatencyColors,
  PingLatencyThresholds,
  PingLossColors,
  PingLossThresholds,
  PingTask,
  ThemeSettings,
  TrafficSpectrumColors,
} from "@/types/komari";
import {
  DEFAULT_PING_LATENCY_COLORS,
  DEFAULT_PING_LATENCY_THRESHOLDS,
  DEFAULT_PING_LOSS_COLORS,
  DEFAULT_PING_LOSS_THRESHOLDS,
  DEFAULT_TRAFFIC_SPECTRUM_COLORS,
  normalizeThemeSettings,
  type ResolvedThemeSettings,
  type StatusBarPreset,
} from "@/utils/themeSettings";
import {
  calculateCostPremiumAmount,
  calculateCostPremiumBasisAt,
  isCostRateApiUrlValid,
  normalizeCostRateApiUrl,
} from "@/utils/cost";
import { normalizeNodeIdentityList } from "@/utils/nodeIdentity";
import {
  assignHomepageMultiPingTask,
  HOMEPAGE_MULTI_PING_MIN_COUNT,
  isHomepageMultiPingConfigured,
  normalizeHomepageMultiPingTaskIds,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import { readCachedThemeSettings, writeCachedThemeSettings } from "@/hooks/useThemeSettings";
import { queryClient } from "@/services/queryClient";
import { ApiRequestError, saveThemeSettings } from "@/services/api";
import type { OverviewRatingKind } from "@/utils/overviewRating";
import type { PremiumDetail } from "./components/PremiumList";
import type { ThemeDraft } from "./types";
import {
  buildPremiumEntry,
  draftFromSettings,
  draftToThemeSettings,
  localDateInputMax,
  managedSettingsSignature,
  pickManagedThemeSettings,
} from "./utils";

export function useThemeManageDraft({
  config,
  allMeta,
  premiumDetailByUuid,
  premiumRates,
  now,
  sortedTasks,
}: {
  config: PublicConfig | undefined;
  allMeta: NodeInfo[];
  premiumDetailByUuid: Map<string, PremiumDetail>;
  premiumRates: Record<string, number> | undefined;
  now: number;
  sortedTasks: PingTask[];
}) {
  const [searchParams] = useSearchParams();

  const sourceThemeSettings = useMemo(() => {
    const raw = config?.theme_settings ?? readCachedThemeSettings();
    const norm = normalizeThemeSettings(raw);
    const paletteParam = searchParams.get("palette");
    if (paletteParam === "divergence" || paletteParam === "eva" || paletteParam === "default") {
      norm.matrixColorTheme = paletteParam;
    }
    const visualModeParam = searchParams.get("visualMode");
    if (visualModeParam === "adaptive" || visualModeParam === "visual" || visualModeParam === "text") {
      norm.overviewCardVisualMode = visualModeParam;
    }
    const microVisualParam = searchParams.get("microVisual");
    if (microVisualParam === "dynamic" || microVisualParam === "static") {
      norm.overviewMicroVisualMode = microVisualParam;
    }
    return norm;
  }, [config?.theme_settings, searchParams]);

  const sourceSignature = useMemo(
    () => JSON.stringify(pickManagedThemeSettings(sourceThemeSettings)),
    [sourceThemeSettings],
  );

  const [draft, setDraft] = useState<ThemeDraft>(() =>
    draftFromSettings(sourceThemeSettings),
  );
  const lastSeededSignatureRef = useRef<string | null>(config ? sourceSignature : null);

  const seedDrafts = useCallback((next: ResolvedThemeSettings) => {
    setDraft(draftFromSettings(next));
  }, []);

  const [syncPhase, setSyncPhase] = useState<"idle" | "saving" | "synced" | "error">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveFlushRef = useRef<(() => void) | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const savingDraftRef = useRef<ThemeDraft | null>(null);
  const editVersionRef = useRef(0);

  const patch = useCallback(
    <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => {
      editVersionRef.current += 1;
      setDraft((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }));
    },
    [],
  );

  const patchBindings = useCallback(
    (updater: (prev: HomepagePingTaskBindings) => HomepagePingTaskBindings) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        homepagePingBindings: updater(prev.homepagePingBindings),
      }));
    },
    [],
  );

  const patchPingLatencyThreshold = useCallback(
    (key: keyof PingLatencyThresholds, val: number) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLatencyThresholds: {
          ...prev.pingLatencyThresholds,
          [key]: val,
        },
      }));
    },
    [],
  );

  const patchPingLatencyColor = useCallback(
    (key: keyof PingLatencyColors, hex: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLatencyColors: {
          ...prev.pingLatencyColors,
          [key]: hex,
        },
      }));
    },
    [],
  );

  const resetPingLatency = useCallback(() => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      pingLatencyThresholds: DEFAULT_PING_LATENCY_THRESHOLDS,
      pingLatencyColors: DEFAULT_PING_LATENCY_COLORS,
    }));
  }, []);

  const patchPingLossThreshold = useCallback(
    (key: keyof PingLossThresholds, val: number) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLossThresholds: {
          ...prev.pingLossThresholds,
          [key]: val,
        },
      }));
    },
    [],
  );

  const patchPingLossColor = useCallback(
    (key: keyof PingLossColors, hex: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLossColors: {
          ...prev.pingLossColors,
          [key]: hex,
        },
      }));
    },
    [],
  );

  const resetPingLoss = useCallback(() => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      pingLossThresholds: DEFAULT_PING_LOSS_THRESHOLDS,
      pingLossColors: DEFAULT_PING_LOSS_COLORS,
    }));
  }, []);

  const patchTrafficSpectrumColor = useCallback(
    (key: keyof TrafficSpectrumColors, hex: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        trafficSpectrumColors: {
          ...prev.trafficSpectrumColors,
          [key]: hex,
        },
      }));
    },
    [],
  );

  const applyStatusBarPreset = useCallback((preset: StatusBarPreset) => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      trafficSpectrumColors: { ...preset.colors },
      pingLatencyColors: { ...preset.latencyColors },
      pingLossColors: { ...preset.lossColors },
    }));
  }, []);

  const resetTrafficSpectrum = useCallback(() => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      trafficSpectrumColors: DEFAULT_TRAFFIC_SPECTRUM_COLORS,
    }));
  }, []);


  const commitMultiPingTaskIds = useCallback(
    (updater: (current: number[]) => number[]) => {
      editVersionRef.current += 1;
      setDraft((prev) => {
        const nextIds = normalizeHomepageMultiPingTaskIds(updater(prev.homepageMultiPingTaskIds));
        return JSON.stringify(nextIds) === JSON.stringify(prev.homepageMultiPingTaskIds)
          ? prev
          : { ...prev, homepageMultiPingTaskIds: nextIds };
      });
    },
    [],
  );

  const patchMultiPingTask = useCallback(
    (slot: number, rawValue: string) => {
      if (rawValue === "") return;
      const parsedId = Number(rawValue);
      if (!Number.isSafeInteger(parsedId) || parsedId <= 0) return;
      commitMultiPingTaskIds((current) => assignHomepageMultiPingTask(current, slot, parsedId));
    },
    [commitMultiPingTaskIds],
  );

  const removeMultiPingTask = useCallback(
    (slot: number) => {
      commitMultiPingTaskIds((current) => {
        if (current.length <= HOMEPAGE_MULTI_PING_MIN_COUNT) return current;
        const next = [...current];
        next.splice(slot, 1);
        return next;
      });
    },
    [commitMultiPingTaskIds],
  );

  const addMultiPingTask = useCallback(() => {
    commitMultiPingTaskIds((current) => {
      const availableTask = sortedTasks.find((task) => !current.includes(task.id));
      if (!availableTask) return current;
      return [...current, availableTask.id];
    });
  }, [commitMultiPingTaskIds, sortedTasks]);

  const setRatingLabelDraft = useCallback((kind: OverviewRatingKind, value: string) => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      ratingLabels: { ...prev.ratingLabels, [kind]: value },
    }));
  }, []);

  const premiumBasisAt = useCallback(
    (uuid: string, acquiredAt?: string): number | null => {
      if (!premiumRates) return null;
      if (!acquiredAt || acquiredAt === localDateInputMax()) {
        const detail = premiumDetailByUuid.get(uuid);
        if (!detail) return null;
        if (detail.note === "免费") return 0;
        return detail.counted ? detail.remainingCny : null;
      }
      return calculateCostPremiumBasisAt(
        allMeta,
        sourceThemeSettings.costIgnoredNodes,
        premiumRates,
        uuid,
        acquiredAt,
        now,
      );
    },
    [allMeta, now, premiumDetailByUuid, premiumRates, sourceThemeSettings.costIgnoredNodes],
  );

  const patchPremiumPaid = useCallback(
    (uuid: string, rawValue: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => {
        const next = { ...prev.costPremiums };
        if (rawValue.trim() === "") {
          if (!(uuid in next)) return prev;
          delete next[uuid];
          return { ...prev, costPremiums: next };
        }
        const paid = Number(rawValue);
        if (!Number.isFinite(paid) || paid < 0) return prev;
        const current = prev.costPremiums[uuid];
        if (current && Object.is(current.paidCny, paid)) return prev;
        const acquiredAt = current?.acquiredAt ?? localDateInputMax();
        const storedBasis =
          current?.paidCny != null ? current.paidCny - current.amount : Number.NaN;
        const basis = Number.isFinite(storedBasis)
          ? storedBasis
          : premiumBasisAt(uuid, acquiredAt);
        if (basis == null) return prev;
        next[uuid] = buildPremiumEntry(
          calculateCostPremiumAmount(paid, basis, current),
          paid,
          acquiredAt,
        );
        return { ...prev, costPremiums: next };
      });
    },
    [premiumBasisAt],
  );

  const patchPremiumAcquiredAt = useCallback(
    (uuid: string, rawValue: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => {
        const current = prev.costPremiums[uuid];
        if (!current) return prev;
        const acquiredAt = rawValue.trim() || undefined;
        if (current.acquiredAt === acquiredAt) return prev;
        let amount = current.amount;
        if (acquiredAt && current.paidCny != null) {
          const basis = premiumBasisAt(uuid, acquiredAt);
          if (basis == null) return prev;
          amount = calculateCostPremiumAmount(current.paidCny, basis);
        }
        const next = { ...prev.costPremiums };
        next[uuid] = buildPremiumEntry(amount, current.paidCny, acquiredAt);
        return { ...prev, costPremiums: next };
      });
    },
    [premiumBasisAt],
  );

  const draftHiddenNodes = useMemo(
    () => normalizeNodeIdentityList(draft.hiddenNodesText),
    [draft.hiddenNodesText],
  );
  const draftCostRateApiUrlInvalid =
    draft.costRateApiUrl.trim() !== "" && !isCostRateApiUrlValid(draft.costRateApiUrl.trim());
  const draftMultiPingInvalid =
    draft.enableHomepageMultiPing &&
    sortedTasks.length > 0 &&
    !isHomepageMultiPingConfigured(draft.homepageMultiPingTaskIds);

  const draftSettings = useMemo(() => draftToThemeSettings(draft), [draft]);
  const draftSignature = useMemo(
    () => managedSettingsSignature(draftSettings),
    [draftSettings],
  );

  const costRateApiUrlDirty =
    normalizeCostRateApiUrl(draft.costRateApiUrl) !==
    normalizeCostRateApiUrl(sourceThemeSettings.costRateApiUrl);

  const isDirty = useMemo(() => {
    return draftSignature !== sourceSignature || costRateApiUrlDirty;
  }, [costRateApiUrlDirty, draftSignature, sourceSignature]);

  useEffect(() => {
    if (isDirty) setMessage(null);
  }, [isDirty]);

  useLayoutEffect(() => {
    if (!config) return;
    if (sourceSignature === lastSeededSignatureRef.current) return;
    if (lastSeededSignatureRef.current !== null && isDirty) return;
    lastSeededSignatureRef.current = sourceSignature;
    seedDrafts(sourceThemeSettings);
  }, [config, isDirty, sourceSignature, sourceThemeSettings, seedDrafts]);

  const handleSave = async (overrideDraft?: Partial<ThemeDraft>) => {
    if (
      !config?.theme ||
      savingDraftRef.current ||
      draftCostRateApiUrlInvalid ||
      draftMultiPingInvalid
    ) {
      return;
    }
    const currentDraft = overrideDraft ? { ...draft, ...overrideDraft } : draft;
    if (overrideDraft) {
      setDraft(currentDraft);
    }
    const currentDraftThemeSettings = draftToThemeSettings(currentDraft);
    const submittedEditVersion = editVersionRef.current;
    savingDraftRef.current = currentDraft;
    setSyncPhase("saving");
    setError(null);
    setMessage(null);
    try {
      const nextSettings: ThemeSettings & Record<string, unknown> = {
        ...(config.theme_settings ?? {}),
        ...currentDraftThemeSettings,
      };
      writeCachedThemeSettings(nextSettings);
      const savePromise = saveThemeSettings(config.theme, nextSettings);
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 260));
      await Promise.all([savePromise, minDelayPromise]);
      lastSeededSignatureRef.current = managedSettingsSignature(nextSettings);
      await queryClient.invalidateQueries({ queryKey: ["public"] });
      if (editVersionRef.current === submittedEditVersion) {
        setSyncPhase("synced");
        setTimeout(() => {
          setSyncPhase((current) => (current === "synced" ? "idle" : current));
        }, 3000);
      } else {
        setSyncPhase("idle");
      }
    } catch (saveError) {
      setSyncPhase("error");
      if (
        saveError instanceof ApiRequestError &&
        (saveError.status === 401 || saveError.status === 403)
      ) {
        showToast("同步失败：管理员未登录或凭据已失效");
        setAccessRevoked(true);
        return;
      }
      const errMsg = saveError instanceof Error ? saveError.message : "同步失败";
      showToast(errMsg);
      setError(errMsg);
      throw saveError;
    } finally {
      savingDraftRef.current = null;
    }
  };

  const THEME_AUTO_SAVE_DEBOUNCE_MS = 800;
  const draftAwaitingAutoSave = isDirty && syncPhase !== "saving";
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!config || editVersionRef.current === 0) return;
    if (!isDirty) return;
    if (draftCostRateApiUrlInvalid || draftMultiPingInvalid) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      autoSaveFlushRef.current = null;
      return;
    }

    const performSave = () => {
      autoSaveFlushRef.current = null;
      void handleSaveRef.current();
    };

    autoSaveFlushRef.current = performSave;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(performSave, THEME_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    config,
    draftCostRateApiUrlInvalid,
    draftMultiPingInvalid,
    isDirty,
    draftSignature,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveFlushRef.current) {
        autoSaveFlushRef.current();
      }
    };
  }, []);

  const handleReset = useCallback(() => {
    seedDrafts(sourceThemeSettings);
    editVersionRef.current += 1;
    showToast("已恢复至当前保存的设置");
  }, [seedDrafts, sourceThemeSettings, showToast]);

  return {
    draft,
    setDraft,
    patch,
    patchBindings,
    patchPingLatencyThreshold,
    patchPingLatencyColor,
    resetPingLatency,
    patchPingLossThreshold,
    patchPingLossColor,
    resetPingLoss,
    patchTrafficSpectrumColor,
    applyStatusBarPreset,
    resetTrafficSpectrum,
    patchMultiPingTask,
    removeMultiPingTask,
    addMultiPingTask,
    setRatingLabelDraft,
    patchPremiumPaid,
    patchPremiumAcquiredAt,
    handleSave,
    handleReset,
    syncPhase,
    isDirty,
    draftAwaitingAutoSave,
    draftHiddenNodes,
    draftCostRateApiUrlInvalid,
    draftMultiPingInvalid,
    message,
    error,
    toastMessage,
    accessRevoked,
    showToast,
    sourceThemeSettings,
  };
}
