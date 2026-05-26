import { createContext, useContext, useState } from "react";
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full font-sans">
        {toasts.map((t) => {
          const bgClass =
            t.type === "success"
              ? "bg-emerald-600 border-emerald-500 shadow-emerald-900/10"
              : t.type === "error"
                ? "bg-red-600 border-red-500 shadow-red-900/10"
                : "bg-neutral-900 border-neutral-800 shadow-black/30";
          return (
            <div
              key={t.id}
              className={`p-4 rounded-xl text-white text-sm font-bold shadow-2xl border pointer-events-auto flex items-center gap-2.5 transition-all duration-300 transform translate-y-0 opacity-100 ${bgClass}`}
            >
              <span className="text-base shrink-0">
                {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
              </span>
              <span className="flex-1 leading-normal">{t.message}</span>
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
