import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, X } from "lucide-react";
import { usePriceVisibility } from "@/hooks/usePriceVisibility";
import {
  EMPTY_RENEWAL_REMINDER_PREFERENCES,
  formatRenewalReminderExpiry,
  getRenewalReminders,
  getVisibleRenewalReminders,
  RENEWAL_SNOOZE_DAYS,
  RENEWAL_SNOOZE_MS,
  RENEWAL_WARNING_DAYS,
  type RenewalReminderPreferences,
  type RenewalReminderSource,
} from "@/utils/renewalReminder";

const STORAGE_KEY = "lumina-renewal-reminders-v1";
const MAX_VISIBLE_ROWS = 4;
const CLOCK_REFRESH_MS = 60 * 60 * 1000;

function readPreferences(): RenewalReminderPreferences {
  if (typeof window === "undefined") return EMPTY_RENEWAL_REMINDER_PREFERENCES;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<RenewalReminderPreferences> | null;
    return {
      dismissedCycles: Array.isArray(parsed?.dismissedCycles) ? parsed!.dismissedCycles : [],
      snoozedUntil:
        parsed?.snoozedUntil && typeof parsed.snoozedUntil === "object"
          ? parsed.snoozedUntil
          : {},
    };
  } catch {
    return EMPTY_RENEWAL_REMINDER_PREFERENCES;
  }
}

function storePreferences(value: RenewalReminderPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // quota exceeded or private mode
  }
}

export function RenewalReminder({
  nodes,
  warningDays = RENEWAL_WARNING_DAYS,
  onOpenChange,
  children,
}: {
  nodes: RenewalReminderSource[];
  warningDays?: number;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const [clock, setClock] = useState(() => Date.now());
  const [preferences, setPreferences] = useState(readPreferences);
  const { isPriceVisible } = usePriceVisibility();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const panelId = useId();
  const titleId = useId();
  const reminders = useMemo(
    () => getRenewalReminders(nodes, clock, { requireOnlineForExpired: true }),
    [clock, nodes],
  );
  const visibleReminders = useMemo(
    () => getVisibleRenewalReminders(reminders, preferences, clock),
    [clock, preferences, reminders],
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (rect.right < 380) {
      setAlign("left");
    } else if (rect.left + 380 > window.innerWidth) {
      setAlign("right");
    } else {
      setAlign("left");
    }
  }, [open]);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    openTimerRef.current = window.setTimeout(() => {
      setOpen(true);
      onOpenChange?.(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      onOpenChange?.(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      onOpenChange?.(false);
      const focusable = triggerRef.current?.querySelector<HTMLElement>("a, button");
      (focusable ?? triggerRef.current)?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      closeRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
    }, CLOCK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setPreferences(readPreferences());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updatePreferences = (next: RenewalReminderPreferences) => {
    setPreferences(next);
    storePreferences(next);
  };

  const closeAndRestoreFocus = () => {
    setOpen(false);
    onOpenChange?.(false);
    if (triggerRef.current instanceof HTMLElement) {
      const focusable = triggerRef.current.querySelector<HTMLElement>("a, button");
      (focusable ?? triggerRef.current).focus();
    }
  };

  const snooze = () => {
    const until = Date.now() + RENEWAL_SNOOZE_MS;
    updatePreferences({
      ...preferences,
      snoozedUntil: {
        ...preferences.snoozedUntil,
        ...Object.fromEntries(visibleReminders.map((item) => [item.cycleKey, until])),
      },
    });
    setClock(Date.now());
    closeAndRestoreFocus();
  };

  const dismissCurrentCycles = () => {
    const dismissed = new Set(preferences.dismissedCycles);
    const snoozedUntil = { ...preferences.snoozedUntil };
    for (const item of visibleReminders) {
      dismissed.add(item.cycleKey);
      delete snoozedUntil[item.cycleKey];
    }
    updatePreferences({ dismissedCycles: [...dismissed], snoozedUntil });
    closeAndRestoreFocus();
  };

  // 只有存在未忽略的临期节点时才渲染弹窗；无临期设备时直接渲染 children 或 null
  if (visibleReminders.length === 0) {
    return children ? <>{children}</> : null;
  }

  const rows = visibleReminders.slice(0, MAX_VISIBLE_ROWS);
  const hiddenCount = visibleReminders.length - rows.length;

  return (
    <div
      className="renewal-reminder shadcn-hover-card-root inline-flex items-center"
      ref={rootRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleMouseEnter}
      onBlurCapture={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) {
          handleMouseLeave();
        }
      }}
    >
      {children ? (
        <div ref={triggerRef as React.RefObject<HTMLDivElement>} className="relative inline-flex items-center justify-center">
          {children}
          <span className="renewal-reminder-dot" aria-hidden />
        </div>
      ) : (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className="overview-card-action renewal-reminder-trigger"
          aria-label={`${visibleReminders.length} 个续费提醒`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          title={`${visibleReminders.length} 个续费提醒`}
          onClick={() => {
            const next = !open;
            setOpen(next);
            onOpenChange?.(next);
          }}
        >
          <CalendarClock size={15} aria-hidden />
          <span className="renewal-reminder-dot" aria-hidden />
        </button>
      )}

      {open && (
        <section
          id={panelId}
          className={`renewal-reminder-panel shadcn-hover-card is-align-${align}`}
          role="dialog"
          aria-labelledby={titleId}
        >
          <header className="renewal-reminder-head">
            <div>
              <div className="renewal-reminder-title-line">
                <h2 id={titleId}>续费提醒</h2>
                <span className="renewal-reminder-count">{visibleReminders.length}</span>
              </div>
              <p>{visibleReminders.length} 台服务器将在 {warningDays} 天内到期</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="renewal-reminder-close"
              aria-label="关闭续费提醒"
              title="关闭"
              onClick={closeAndRestoreFocus}
            >
              <X size={15} aria-hidden />
            </button>
          </header>

          <div className="renewal-reminder-list">
            {rows.map((item) => (
              <div className="renewal-reminder-row" key={item.cycleKey}>
                <div className="renewal-reminder-row-main">
                  <strong title={item.name}>{item.name}</strong>
                  <span>{formatRenewalReminderExpiry(item.daysRemaining)}</span>
                  {isPriceVisible && item.priceLabel && <span>{item.priceLabel}</span>}
                </div>
                <span className="renewal-reminder-status" data-tone={item.tone}>
                  {item.statusLabel}
                </span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <p className="renewal-reminder-more">还有 {hiddenCount} 台临期服务器</p>
            )}
          </div>

          <footer className="renewal-reminder-actions">
            <Link to="/assets" className="renewal-reminder-detail" onClick={() => setOpen(false)}>
              查看详情
            </Link>
            <div className="renewal-reminder-btn-group" role="group" aria-label="提醒操作">
              <button type="button" className="renewal-reminder-later" onClick={snooze}>
                {RENEWAL_SNOOZE_DAYS} 天后提醒
              </button>
              <button
                type="button"
                className="renewal-reminder-dismiss"
                onClick={dismissCurrentCycles}
              >
                本周期不再提醒
              </button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
