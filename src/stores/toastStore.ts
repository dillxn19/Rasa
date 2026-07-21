import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (t) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    // Auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 2800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/**
 * Imperative toast API — call from anywhere (services, handlers) without hooks.
 * Replaces Alert.alert for non-blocking notifications.
 */
export const toast = {
  success: (message: string, title?: string) => useToastStore.getState().show({ type: 'success', message, title }),
  error: (message: string, title?: string) => useToastStore.getState().show({ type: 'error', message, title }),
  info: (message: string, title?: string) => useToastStore.getState().show({ type: 'info', message, title }),
};
