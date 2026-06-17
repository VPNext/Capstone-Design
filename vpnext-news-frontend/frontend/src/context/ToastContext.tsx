import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_ICONS: Record<ToastMessage["type"], string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const TOAST_STYLES: Record<
  ToastMessage["type"],
  { bg: string; border: string; icon: string }
> = {
  success: {
    bg: "bg-emerald-600",
    border: "border-emerald-500",
    icon: "bg-emerald-500",
  },
  error: {
    bg: "bg-red-600",
    border: "border-red-500",
    icon: "bg-red-500",
  },
  info: {
    bg: "bg-neutral-800",
    border: "border-neutral-700",
    icon: "bg-neutral-600",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container — 슬라이드 인 애니메이션 적용 */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[340px] w-full font-sans"
        aria-live="polite"
        aria-label="알림"
      >
        {toasts.map((t) => {
          const styles = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              className={`toast-enter flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white text-sm font-bold shadow-2xl border pointer-events-auto ${styles.bg} ${styles.border}`}
            >
              {/* 아이콘 원형 뱃지 */}
              <span
                className={`w-6 h-6 rounded-full ${styles.icon} flex items-center justify-center text-xs font-black shrink-0`}
                aria-hidden="true"
              >
                {TOAST_ICONS[t.type]}
              </span>
              <span className="flex-1 leading-snug">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
