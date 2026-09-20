import { getExpireDaysRemaining, LONG_TERM_EXPIRE_DAYS } from "@/utils/format";

const INT_PRICE_FORMATTER = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const DECIMAL_PRICE_FORMATTER = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT_PRICE_FORMATTER = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const COMMON_CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  "US$": "$",
  "$US": "$",
  "USD$": "$",
  "$USD": "$",
  CAD: "C$",
  "C$": "C$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  RMB: "¥",
  "CN¥": "¥",
  HKD: "HK$",
  "HK$": "HK$",
  TWD: "NT$",
  "NT$": "NT$",
  AUD: "A$",
  "A$": "A$",
  SGD: "S$",
  "S$": "S$",
  NZD: "NZ$",
  "NZ$": "NZ$",
  KRW: "₩",
  RUB: "₽",
  THB: "฿",
};

export function resolveCurrencySymbol(currency?: string | null): string {
  if (!currency) return "¥";
  const trimmed = currency.trim();
  if (!trimmed) return "¥";
  return COMMON_CURRENCY_SYMBOLS[trimmed.toUpperCase()] || trimmed;
}

function formatPriceNumber(value: number, compact = false) {
  if (compact) {
    return COMPACT_PRICE_FORMATTER.format(value);
  }
  return (Number.isInteger(value) ? INT_PRICE_FORMATTER : DECIMAL_PRICE_FORMATTER).format(value);
}

function isLongTermExpire(value: string | number | null | undefined) {
  if (value == null) return false;
  const days = getExpireDaysRemaining(value);
  return days != null && days > LONG_TERM_EXPIRE_DAYS;
}

type BillingCycleKind = "month" | "quarter" | "halfYear" | "year" | "lifetime";

/** 中文数字 → 年数，覆盖 Komari 后台的「两年」到「五年」。 */
const CHINESE_YEAR_WORDS: Record<string, number> = {
  "一": 1,
  "两": 2,
  "二": 2,
  "三": 3,
  "四": 4,
  "五": 5,
};

export const CHINESE_YEAR_NAMES: Record<number, string> = {
  1: "年",
  2: "两年",
  3: "三年",
  4: "四年",
  5: "五年",
};

export const CHINESE_YEAR_PAY_NAMES: Record<number, string> = {
  1: "年付",
  2: "两年付",
  3: "三年付",
  4: "四年付",
  5: "五年付",
};

/**
 * 把自由文本的账单周期关键词(须预先 lowercase/trim)归类成标准周期,识别不出时返回 null。
 * 这里的标签格式化和 utils/cost.ts 里的天数解析共用它,让这套正则只存在一处。
 */
export function classifyBillingCycleWord(
  normalized: string,
): { kind: BillingCycleKind; years?: number } | null {
  if (/^(monthly|month|mo|月|每月|月付)$/.test(normalized)) return { kind: "month" };
  if (/^(quarterly|quarter|季|季度|每季|季付)$/.test(normalized)) return { kind: "quarter" };
  if (/^(semi-?annual(ly)?|half[-_]?year(ly)?|半年|半年付)$/.test(normalized)) {
    return { kind: "halfYear" };
  }
  if (/^(annual(ly)?|yearly|year|yr|年|一年|每年|年付)$/.test(normalized)) {
    return { kind: "year", years: 1 };
  }
  if (/^(lifetime|once|one-time|永久|一次性|一次性付费|买断)$/.test(normalized)) {
    return { kind: "lifetime" };
  }

  // 两年 / 三年 / 四年 / 五年 / 两年付 / 三年付
  const chineseYears = /^([一两二三四五])年(付)?$/.exec(normalized);
  if (chineseYears) {
    return { kind: "year", years: CHINESE_YEAR_WORDS[chineseYears[1]!]! };
  }

  // 2年 / 3年 / 2年付 / 3年付 / two_years / 3 years
  const numberYears = /^(\d+)[-_\s]*(年|年付|y|yr|yrs|year|years)$/.exec(normalized);
  if (numberYears) {
    return { kind: "year", years: Number(numberYears[1]) };
  }

  const wordYears = /^(two|three|four|five)[-_\s]*years?$/.exec(normalized);
  if (wordYears) {
    const years = { two: 2, three: 3, four: 4, five: 5 }[wordYears[1]!]!;
    return { kind: "year", years };
  }

  return null;
}

export interface NormalizedBillingCycle {
  kind: BillingCycleKind | "days";
  /** 摊销天数;lifetime 为 -1 哨兵。 */
  days: number;
  /** kind === "year" 时的整年数(365/360 天均视为 1 年)。 */
  years?: number;
}

/**
 * 严格按照 Komari 后台计费周期规则进行归一化：
 * 1. 按预设周期（日历续费）：数值相近时按对应日历周期计算
 *    常用数值：30（月）、92（季）、180/182（半年）、365（年）、730（两年）、1095（三年）等
 * 2. 按自定义天数：当输入其他天数时（如 7, 45, 100），严格按天数续费
 * 3. 一次性付费：输入 -1 表示一次性付费
 */
export function normalizeBillingCycle(
  value: string | number | null | undefined,
): NormalizedBillingCycle {
  const raw = String(value ?? "").trim();
  const numeric = Number(raw);

  if (raw !== "" && Number.isFinite(numeric)) {
    if (numeric === -1) return { kind: "lifetime", days: -1 };

    // Komari 后台预设方案的相近数值匹配
    if (numeric >= 28 && numeric <= 31) return { kind: "month", days: 30 };
    if (numeric >= 89 && numeric <= 93) return { kind: "quarter", days: 90 };
    if (numeric >= 180 && numeric <= 184) return { kind: "halfYear", days: 180 };
    if (numeric >= 360 && numeric <= 366) return { kind: "year", days: 365, years: 1 };
    if (numeric >= 725 && numeric <= 735) return { kind: "year", days: 730, years: 2 };
    if (numeric >= 1090 && numeric <= 1100) return { kind: "year", days: 1095, years: 3 };
    if (numeric >= 1455 && numeric <= 1465) return { kind: "year", days: 1460, years: 4 };
    if (numeric >= 1820 && numeric <= 1830) return { kind: "year", days: 1825, years: 5 };

    if (numeric > 0 && numeric % 365 === 0) {
      const years = Math.round(numeric / 365);
      return { kind: "year", days: numeric, years };
    }
    if (numeric > 0 && numeric % 360 === 0) {
      const years = Math.round(numeric / 360);
      return { kind: "year", days: numeric, years };
    }

    if (numeric > 0) return { kind: "days", days: numeric };
  }

  const word = classifyBillingCycleWord(raw.toLowerCase());
  switch (word?.kind) {
    case "month":
      return { kind: "month", days: 30 };
    case "quarter":
      return { kind: "quarter", days: 90 };
    case "halfYear":
      return { kind: "halfYear", days: 180 };
    case "lifetime":
      return { kind: "lifetime", days: -1 };
    case "year": {
      const years = word.years && word.years > 0 ? word.years : 1;
      return { kind: "year", days: years * 365, years };
    }
    default:
      return { kind: "year", days: 365, years: 1 };
  }
}

/** 格式化节点价格后的计费周期后缀（如 ¥71.08/三年 或 ¥30/月） */
export function formatBillingCycle(value: string | number | null | undefined) {
  const cycle = normalizeBillingCycle(value);
  switch (cycle.kind) {
    case "lifetime":
      return "一次性";
    case "month":
      return "月";
    case "quarter":
      return "季";
    case "halfYear":
      return "半年";
    case "year":
      return CHINESE_YEAR_NAMES[cycle.years ?? 1] || `${cycle.years}年`;
    case "days":
      return `${cycle.days}天`;
  }
}

/** 格式化紧凑小卡片等高密度场景的周期后缀（如 $71/3年 或 $5.8/月） */
export function formatCompactBillingCycleText(value: string | number | null | undefined) {
  const cycle = normalizeBillingCycle(value);
  switch (cycle.kind) {
    case "lifetime":
      return "一次";
    case "month":
      return "月";
    case "quarter":
      return "季";
    case "halfYear":
      return "半年";
    case "year":
      return cycle.years && cycle.years > 1 ? `${cycle.years}年` : "年";
    case "days":
      return `${cycle.days}天`;
  }
}

export function formatRenewalPrice({
  price,
  currency,
  billing_cycle,
  expired_at,
}: {
  price: number;
  currency: string;
  billing_cycle?: string | number | null;
  expired_at?: string | number | null;
}) {
  if (!Number.isFinite(price)) return null;
  if (price === -1) return "免费";
  if (price === 0) return isLongTermExpire(expired_at) ? "免费" : null;
  if (price < 0) return null;

  const symbol = currency?.trim() || "¥";
  const cycle = formatBillingCycle(billing_cycle);
  return `${symbol}${formatPriceNumber(price)}/${cycle}`;
}

export function formatCompactRenewalPrice({
  price,
  currency,
  billing_cycle,
  expired_at,
}: {
  price: number;
  currency: string;
  billing_cycle?: string | number | null;
  expired_at?: string | number | null;
}) {
  if (!Number.isFinite(price)) return null;
  if (price === -1) return "免费";
  if (price === 0) return isLongTermExpire(expired_at) ? "免费" : null;
  if (price < 0) return null;

  const symbol = resolveCurrencySymbol(currency);
  const cycle = formatCompactBillingCycleText(billing_cycle);
  return `${symbol}${formatPriceNumber(price, true)}/${cycle}`;
}

