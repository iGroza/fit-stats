import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastInput {
  kind: ToastKind;
  title: string;
  message?: string;
  /** Авто-скрытие, мс. 0 = не скрывать (только крестик). */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  /** Фаза выхода — DOM ещё жив, крутится exit-анимация. */
  exiting?: boolean;
}

interface ToastApi {
  push: (toast: ToastInput) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastApi | null>(null);

/** Макс. тостов на экране; новые вытесняют самые старые. */
const MAX_TOASTS = 5;
const DEFAULT_MS = 4200;
const EXIT_MS = 320;

export const useToast = (): ToastApi => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};

const ICONS: Record<ToastKind, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-exclamation',
  info: 'fa-circle-info',
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const autoTimers = useRef(new Map<number, number>());
  const exitTimers = useRef(new Map<number, number>());

  const clearAuto = (id: number) => {
    const t = autoTimers.current.get(id);
    if (t) {
      window.clearTimeout(t);
      autoTimers.current.delete(id);
    }
  };

  const removeNow = useCallback((id: number) => {
    clearAuto(id);
    const et = exitTimers.current.get(id);
    if (et) {
      window.clearTimeout(et);
      exitTimers.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      clearAuto(id);
      if (exitTimers.current.has(id)) return;

      setItems((prev) => {
        const hit = prev.find((x) => x.id === id);
        if (!hit || hit.exiting) return prev;
        return prev.map((x) => (x.id === id ? { ...x, exiting: true } : x));
      });

      const et = window.setTimeout(() => removeNow(id), EXIT_MS);
      exitTimers.current.set(id, et);
    },
    [removeNow]
  );

  const push = useCallback(
    (toast: ToastInput) => {
      const id = ++seq.current;
      const item: ToastItem = { ...toast, id };

      setItems((prev) => {
        const active = prev.filter((x) => !x.exiting);
        const leaving = prev.filter((x) => x.exiting);
        // Вытесняем самые старые активные, если лимит.
        let keep = active;
        if (active.length >= MAX_TOASTS) {
          const overflow = active.slice(0, active.length - (MAX_TOASTS - 1));
          keep = active.slice(-(MAX_TOASTS - 1));
          for (const d of overflow) {
            window.setTimeout(() => dismiss(d.id), 0);
          }
        }
        return [...leaving, ...keep, item];
      });

      const ms = toast.duration ?? DEFAULT_MS;
      if (ms > 0) {
        const tm = window.setTimeout(() => dismiss(id), ms);
        autoTimers.current.set(id, tm);
      }
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, message) => push({ kind: 'success', title, message }),
      error: (title, message) => push({ kind: 'error', title, message, duration: 5600 }),
      info: (title, message) => push({ kind: 'info', title, message }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions text">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.kind}${t.exiting ? ' is-leaving' : ' is-enter'}`}
            role="status"
          >
            <span className="toast__icon" aria-hidden="true">
              <i className={`fa-solid ${ICONS[t.kind]}`} />
            </span>
            <div className="toast__body">
              <b className="toast__title">{t.title}</b>
              {t.message && <span className="toast__msg">{t.message}</span>}
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Close"
              onClick={() => dismiss(t.id)}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};
