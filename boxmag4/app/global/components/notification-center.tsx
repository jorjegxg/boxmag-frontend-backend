"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type NotificationType = "success" | "error" | "info";

type Notification = {
  id: number;
  type: NotificationType;
  message: string;
};

type NotifyInput = {
  type: NotificationType;
  message: string;
  durationMs?: number;
};

type NotificationContextValue = {
  notify: (input: NotifyInput) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback(({ type, message, durationMs = 3500 }: NotifyInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    }, durationMs);
  }, []);

  const remove = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-100 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {notifications.map((item) => {
          const toneClass =
            item.type === "success"
              ? "border-green-300 bg-green-50 text-green-700"
              : item.type === "error"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-blue-300 bg-blue-50 text-blue-700";

          return (
            <div
              key={item.id}
              role="alert"
              aria-live="assertive"
              className={`rounded-lg border px-4 py-3 shadow-lg ${toneClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{item.message}</p>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="text-xs font-semibold uppercase opacity-70 hover:opacity-100"
                >
                  x
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
