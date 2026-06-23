"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import "./toast.css";

/**
 * Hand-rolled toast system (no Radix / shadcn). Global, hand-rolled React
 * context — mounted once in the root layout so every route (incl. /login,
 * /admin) can surface feedback. See the API contract below.
 *
 *   const { toast, dismiss } = useToast();
 *   const id = toast({ title, description?, variant?, duration?, action? });
 *   dismiss(id);  // optional — for sticky (duration: 0) toasts
 *
 * Behaviour (locked decisions F1–F10): bottom-centered, max 3 at once (oldest
 * auto-evicts), identical title within 2s bumps a "(n)" counter instead of
 * stacking, newest renders at the bottom, FIFO auto-dismiss after `duration`
 * (default 5000ms; 0 = sticky), z-index above modals, aria-live polite for
 * info/success and assertive for error.
 */

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
  /** Dismiss the toast after the action runs. Default true. */
  closeOnClick?: boolean;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant; // default "info"
  duration?: number; // ms; default 5000; 0 = sticky
  action?: ToastAction;
}

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
  count: number;
  createdAt: number;
  leaving: boolean;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;
const DEDUP_WINDOW_MS = 2000;
const EXIT_MS = 200;

const ICONS = { success: Check, error: AlertCircle, info: Info } as const;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Mirror of state for reads inside event handlers (dedup lookup) without
  // re-creating the toast() callback on every render.
  const toastsRef = useRef<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  const clearTimer = useCallback((key: string) => {
    const t = timers.current.get(key);
    if (t) {
      clearTimeout(t);
      timers.current.delete(key);
    }
  }, []);

  const remove = useCallback(
    (id: string) => {
      clearTimer(id);
      clearTimer(`${id}__exit`);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer]
  );

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      clearTimer(`${id}__exit`);
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      timers.current.set(`${id}__exit`, setTimeout(() => remove(id), EXIT_MS));
    },
    [clearTimer, remove]
  );

  const scheduleAutoDismiss = useCallback(
    (id: string, duration: number) => {
      if (!duration) return; // 0 = sticky
      clearTimer(id);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [clearTimer, dismiss]
  );

  const toast = useCallback(
    (opts: ToastOptions): string => {
      const now = Date.now();
      const variant = opts.variant ?? "info";
      const duration = opts.duration ?? DEFAULT_DURATION;

      // F3 — identical title within the window bumps a counter on the existing toast.
      const existing = toastsRef.current.find(
        (t) => !t.leaving && t.title === opts.title && now - t.createdAt < DEDUP_WINDOW_MS
      );
      if (existing) {
        setToasts((prev) =>
          prev.map((t) => (t.id === existing.id ? { ...t, count: t.count + 1, createdAt: now } : t))
        );
        scheduleAutoDismiss(existing.id, existing.duration);
        return existing.id;
      }

      const id = `toast-${++idRef.current}`;
      const item: ToastItem = {
        id,
        title: opts.title,
        description: opts.description,
        variant,
        duration,
        action: opts.action,
        count: 1,
        createdAt: now,
        leaving: false,
      };

      setToasts((prev) => {
        const next = [...prev, item];
        if (next.length > MAX_TOASTS) {
          // F2 — evict the oldest (front of the list).
          next.slice(0, next.length - MAX_TOASTS).forEach((old) => clearTimer(old.id));
          return next.slice(next.length - MAX_TOASTS);
        }
        return next;
      });
      scheduleAutoDismiss(id, duration);
      return id;
    },
    [scheduleAutoDismiss, clearTimer]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  function runAction(t: ToastItem) {
    t.action?.onClick();
    if (t.action && t.action.closeOnClick !== false) dismiss(t.id);
  }

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant];
          const assertive = t.variant === "error";
          return (
            <div
              key={t.id}
              className={`toast ${t.variant}${t.leaving ? " leaving" : ""}`}
              role={assertive ? "alert" : "status"}
              aria-live={assertive ? "assertive" : "polite"}
            >
              <span className="toast-icon">
                <Icon size={15} aria-hidden="true" />
              </span>
              <div className="toast-body">
                <div className="toast-title">
                  {t.title}
                  {t.count > 1 && <span className="toast-count"> ({t.count})</span>}
                </div>
                {t.description && <div className="toast-desc">{t.description}</div>}
                {t.action && (
                  <button type="button" className="toast-action" onClick={() => runAction(t)}>
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
