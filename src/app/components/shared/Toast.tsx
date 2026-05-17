"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastItem = {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
};

let addToastFn: ((toast: Omit<ToastItem, "id">) => void) | null = null;

export function toast(type: ToastItem["type"], message: string) {
  addToastFn?.({ type, message });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let counter = 0;

  const addToast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `toast-${++counter}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...item, id }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 text-green-500" />,
    error: <XCircle className="size-4 text-red-500" />,
    warning: <AlertTriangle className="size-4 text-yellow-500" />,
    info: <Info className="size-4 text-blue-500" />,
  };

  const bgColors: Record<string, string> = {
    success: "border-green-200 bg-green-50",
    error: "border-red-200 bg-red-50",
    warning: "border-yellow-200 bg-yellow-50",
    info: "border-blue-200 bg-blue-50",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg min-w-[280px] max-w-[400px] ${bgColors[t.type]}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {icons[t.type]}
            <span className="flex-1 text-sm font-medium text-[#333]">{t.message}</span>
            <button
              className="shrink-0 text-[#999] hover:text-[#333]"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
