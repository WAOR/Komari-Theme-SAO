export type OverviewRatingKind = "bandwidth";

export interface OverviewRating {
  level: 0 | 1 | 2 | 3;
  label: string;
}

const MBPS_IN_BYTES_PER_SECOND = 1_000_000 / 8;

const DEFAULT_LABELS: Record<OverviewRatingKind, readonly string[]> = {
  bandwidth: ["IDLE", "LIGHT", "ACTIVE", "SURGE"],
};

export function getDefaultOverviewRatingLabelText(kind: OverviewRatingKind = "bandwidth") {
  return DEFAULT_LABELS[kind].join(",");
}

export function normalizeOverviewRatingLabels(
  kind: OverviewRatingKind = "bandwidth",
  customLabels: string | null | undefined,
) {
  const fallback = DEFAULT_LABELS[kind];
  const custom = String(customLabels ?? "")
    .split(",")
    .map((label) => label.trim())
    .slice(0, 4);

  return fallback.map((label, index) => custom[index] || label);
}

function levelFromThresholds(value: number, thresholds: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  if (value <= thresholds[0]) return 0;
  if (value <= thresholds[1]) return 1;
  if (value <= thresholds[2]) return 2;
  return 3;
}

export function getOverviewRating({
  kind = "bandwidth",
  value,
  customLabels,
}: {
  kind?: OverviewRatingKind;
  value: number;
  customLabels?: string | null;
}): OverviewRating {
  const labels = normalizeOverviewRatingLabels(kind, customLabels);
  const level = levelFromThresholds(value, [
    1 * MBPS_IN_BYTES_PER_SECOND,
    10 * MBPS_IN_BYTES_PER_SECOND,
    100 * MBPS_IN_BYTES_PER_SECOND,
  ]);

  return {
    level,
    label: labels[level],
  };
}
