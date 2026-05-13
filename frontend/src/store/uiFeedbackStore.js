import { create } from 'zustand';

let toastSeq = 0;

export const useUiFeedbackStore = create((set, get) => ({
  toasts: [],

  pushToast: (message, type = 'info') => {
    const id = ++toastSeq;
    set((s) => ({
      toasts: [...s.toasts, { id, message: String(message ?? ''), type }],
    }));
    window.setTimeout(() => {
      get().removeToast(id);
    }, 4800);
  },

  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),

  confirm: null,

  requestConfirm: (message) =>
    new Promise((resolve) => {
      set({
        confirm: {
          message: String(message ?? ''),
          onResult: (ok) => {
            resolve(Boolean(ok));
            set({ confirm: null });
          },
        },
      });
    }),

  prompt: null,

  requestPrompt: (message, defaultValue = '') =>
    new Promise((resolve) => {
      set({
        prompt: {
          message: String(message ?? ''),
          defaultValue: String(defaultValue ?? ''),
          onResult: (value) => {
            resolve(value);
            set({ prompt: null });
          },
        },
      });
    }),
}));
