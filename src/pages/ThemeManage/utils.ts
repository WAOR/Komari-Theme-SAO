import type { AdminClient, PingTask, ThemeSettings } from "@/types/komari";
import type { CostPremiumEntry } from "@/utils/cost";
import { normalizeHomepagePingTaskBindings, type HomepagePingTaskBindings } from "@/utils/pingTasks";
import {
  normalizeOverviewCards,
  normalizePingLatencyColors,
  normalizePingLatencyThresholds,
  normalizePingLossColors,
  normalizePingLossThresholds,
  normalizeThemeSettings,
  normalizeTrafficSpectrumColors,
  type ResolvedThemeSettings,
} from "@/utils/themeSettings";
import {
  normalizeCostIgnoredNodes,
  normalizeCostPremiums,
  normalizeCostRateApiUrl,
} from "@/utils/cost";
import { normalizeNodeIdentityList } from "@/utils/nodeIdentity";
import { normalizeHomeGroupOrder } from "@/utils/homeNodes";
import type { ThemeDraft } from "./types";

export function localDateInputMax() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function sortTasks(tasks: PingTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    if (left.id !== right.id) return left.id - right.id;
    return left.name.localeCompare(right.name);
  });
}

export function buildPremiumEntry(
  amount: number,
  paidCny?: number,
  acquiredAt?: string,
): CostPremiumEntry {
  return {
    amount,
    ...(paidCny != null ? { paidCny } : {}),
    ...(acquiredAt ? { acquiredAt } : {}),
  };
}

export function sortClients(clients: AdminClient[]) {
  return [...clients].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    return left.name.localeCompare(right.name);
  });
}

export function filterClients(clients: AdminClient[], rawKeyword: string) {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return clients;
  return clients.filter((client) => {
    const group = String(client.group || "").toLowerCase();
    const region = String(client.region || "").toLowerCase();
    return (
      client.name.toLowerCase().includes(keyword) ||
      client.uuid.toLowerCase().includes(keyword) ||
      group.includes(keyword) ||
      region.includes(keyword)
    );
  });
}

export function summarizeNodes(
  uuids: string[],
  clientsById: Map<string, AdminClient>,
) {
  if (uuids.length === 0) return "未绑定节点";
  const names = uuids.map((uuid) => clientsById.get(uuid)?.name || uuid);
  const summary = names.join("、");
  return summary.length > 92 ? `${summary.slice(0, 92)}...` : summary;
}

export function pruneBindings(bindings: HomepagePingTaskBindings) {
  const normalized = normalizeHomepagePingTaskBindings(bindings);
  const pruned: HomepagePingTaskBindings = {};

  for (const [taskId, clients] of Object.entries(normalized)) {
    if (clients.length > 0) {
      pruned[taskId] = clients;
    }
  }

  return pruned;
}

export function applyClientAssignment(
  bindings: HomepagePingTaskBindings,
  taskId: number,
  clientUuid: string,
  checked: boolean,
) {
  const taskKey = String(taskId);
  const next = pruneBindings(bindings);

  for (const [currentTaskId, clients] of Object.entries(next)) {
    const filtered = clients.filter((uuid) => uuid !== clientUuid);
    if (filtered.length > 0) {
      next[currentTaskId] = filtered;
    } else {
      delete next[currentTaskId];
    }
  }

  if (checked) {
    const selected = next[taskKey] ?? [];
    next[taskKey] = Array.from(new Set([...selected, clientUuid])).sort((left, right) =>
      left.localeCompare(right),
    );
  }

  return next;
}

export function invertBindings(bindings: HomepagePingTaskBindings): Map<string, string> {
  const assignedTaskByClient = new Map<string, string>();
  for (const [taskId, clients] of Object.entries(bindings)) {
    for (const clientUuid of clients) {
      assignedTaskByClient.set(clientUuid, taskId);
    }
  }
  return assignedTaskByClient;
}

export function applyAvailableClientAssignments(
  bindings: HomepagePingTaskBindings,
  taskId: number,
  clientUuids: string[],
) {
  const taskKey = String(taskId);
  const next = pruneBindings(bindings);
  const assignedTaskByClient = invertBindings(next);
  const selected = new Set(next[taskKey] ?? []);

  for (const clientUuid of clientUuids) {
    const assignedTaskId = assignedTaskByClient.get(clientUuid);
    if (!assignedTaskId || assignedTaskId === taskKey) {
      selected.add(clientUuid);
    }
  }

  next[taskKey] = Array.from(selected).sort((left, right) => left.localeCompare(right));
  return next;
}

export function pickManagedThemeSettings(settings: ResolvedThemeSettings) {
  return {
    defaultAppearance: settings.defaultAppearance,
    desktopNodeViewMode: settings.desktopNodeViewMode,
    mobileNodeViewMode: settings.mobileNodeViewMode,
    serverCardTemplate: settings.serverCardTemplate,
    clusterOverviewMode: settings.clusterOverviewMode,
    matrixColorTheme: settings.matrixColorTheme,
    matrixBootEffect: settings.matrixBootEffect,
    matrixMockFill: settings.matrixMockFill,
    matrixBootAnimation: settings.matrixBootAnimation,
    matrixCustomPattern: settings.matrixCustomPattern,
    matrixUserPresets: settings.matrixUserPresets,
    homepagePingBindings: settings.homepagePingBindings,
    enableHomepageMultiPing: settings.enableHomepageMultiPing,
    homepageMultiPingTaskIds: settings.homepageMultiPingTaskIds,
    fakePingForUnbound: settings.fakePingForUnbound,
    pingLatencyThresholds: settings.pingLatencyThresholds,
    pingLatencyColors: settings.pingLatencyColors,
    pingLossThresholds: settings.pingLossThresholds,
    pingLossColors: settings.pingLossColors,
    trafficSpectrumColors: settings.trafficSpectrumColors,
    showHomeOverview: settings.showHomeOverview,
    overviewCards: settings.overviewCards,
    overviewCardVisualMode: settings.overviewCardVisualMode,
    overviewMicroVisualMode: settings.overviewMicroVisualMode,
    overviewStaticCards: settings.overviewStaticCards,
    showGroupTabs: settings.showGroupTabs,
    showRegionBar: settings.showRegionBar,
    showCardGroup: settings.showCardGroup,
    homeGroupOrder: settings.homeGroupOrder,
    enableHomeSort: settings.enableHomeSort,
    homeSortField: settings.homeSortField,
    homeSortDirection: settings.homeSortDirection,
    showCostSummary: settings.showCostSummary,
    showCostSummaryFloatingButton: settings.showCostSummaryFloatingButton,
    showTrafficPageButton: settings.showTrafficPageButton,
    showTrafficPageForGuests: settings.showTrafficPageForGuests,
    showPriceForGuests: settings.showPriceForGuests,
    showOverviewRatings: settings.showOverviewRatings,
    showBandwidthRating: settings.showBandwidthRating,
    bandwidthRatingLabels: settings.bandwidthRatingLabels,
    compactShowTrafficTotal: settings.compactShowTrafficTotal,
    compactShowBilling: settings.compactShowBilling,
    compactShowUptime: settings.compactShowUptime,
    showConnections: settings.showConnections,
    showTodayTrafficPopover: settings.showTodayTrafficPopover,
    hiddenNodes: settings.hiddenNodes,
    costIgnoredNodes: settings.costIgnoredNodes,
    carrierLossIncludedNodes: settings.carrierLossIncludedNodes,
    yesterdayBestIncludedNodes: settings.yesterdayBestIncludedNodes,
    yesterdayBestScope: settings.yesterdayBestScope,
    yesterdayBestDisplayMode: settings.yesterdayBestDisplayMode,
    costPremiums: Object.fromEntries(
      Object.keys(settings.costPremiums)
        .sort()
        .map((uuid) => [uuid, settings.costPremiums[uuid]]),
    ),
    costRateApiUrl: settings.costRateApiUrl,
    costCurrency: settings.costCurrency,
  };
}

export function managedSettingsSignature(settings: ThemeSettings) {
  return JSON.stringify(pickManagedThemeSettings(normalizeThemeSettings(settings)));
}

export function draftFromSettings(settings: ResolvedThemeSettings): ThemeDraft {
  const {
    hiddenNodes,
    costIgnoredNodes,
    bandwidthRatingLabels,
    ...rest
  } = pickManagedThemeSettings(settings);
  return {
    ...rest,
    ratingLabels: {
      bandwidth: bandwidthRatingLabels,
    },
    hiddenNodesText: hiddenNodes.join("\n"),
    costIgnoredText: costIgnoredNodes.join("\n"),
  };
}

export function draftToThemeSettings(targetDraft: ThemeDraft): ThemeSettings {
  const {
    ratingLabels,
    hiddenNodesText,
    costIgnoredText,
    ...rest
  } = targetDraft;
  return {
    ...rest,
    pingLatencyThresholds: normalizePingLatencyThresholds(rest.pingLatencyThresholds),
    pingLatencyColors: normalizePingLatencyColors(rest.pingLatencyColors),
    pingLossThresholds: normalizePingLossThresholds(rest.pingLossThresholds),
    pingLossColors: normalizePingLossColors(rest.pingLossColors),
    trafficSpectrumColors: normalizeTrafficSpectrumColors(rest.trafficSpectrumColors),
    overviewCards: normalizeOverviewCards(rest.overviewCards),
    homepagePingBindings: pruneBindings(rest.homepagePingBindings),
    homeGroupOrder: normalizeHomeGroupOrder(rest.homeGroupOrder),
    bandwidthRatingLabels: ratingLabels.bandwidth,
    hiddenNodes: normalizeNodeIdentityList(hiddenNodesText),
    costIgnoredNodes: normalizeCostIgnoredNodes(costIgnoredText),
    carrierLossIncludedNodes: normalizeNodeIdentityList(rest.carrierLossIncludedNodes),
    yesterdayBestIncludedNodes: normalizeNodeIdentityList(rest.yesterdayBestIncludedNodes),
    yesterdayBestScope: rest.yesterdayBestScope,
    yesterdayBestDisplayMode: rest.yesterdayBestDisplayMode,
    costPremiums: normalizeCostPremiums(rest.costPremiums),
    costRateApiUrl: normalizeCostRateApiUrl(rest.costRateApiUrl),
    costCurrency: rest.costCurrency,
  };
}
