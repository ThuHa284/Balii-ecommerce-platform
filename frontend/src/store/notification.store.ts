import { create } from "zustand";

export interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    set({ notifications: [newNotification, ...get().notifications] });
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      set({ notifications: get().notifications.filter((n) => n.id !== newNotification.id) });
    }, 5000);
  },
  dismissNotification: (id) =>
    set({ notifications: get().notifications.filter((n) => n.id !== id) }),
  clearAll: () => set({ notifications: [] }),
}));
