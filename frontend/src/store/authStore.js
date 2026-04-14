import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

/** Chuẩn hóa id tài khoản (API có thể trả id/_id, string/ObjectId) — tránh === lệch và trùng mục. */
function normalizeAccountId(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && value !== null) {
    if (typeof value.toString === 'function') {
      const s = value.toString();
      if (s && s !== '[object Object]') return s;
    }
    if (value._id != null) return normalizeAccountId(value._id);
  }
  return String(value);
}

function dedupeAccountsById(accounts) {
  const map = new Map();
  for (const acc of accounts) {
    if (!acc) continue;
    const id = normalizeAccountId(acc.id ?? acc.user?.id ?? acc.user?._id);
    if (!id) continue;
    map.set(id, { ...acc, id });
  }
  return Array.from(map.values());
}

/** Phiên cũ chỉ lưu user+token, chưa có accounts — gom thành một mục để không mất tài khoản đang đăng nhập. */
function seedAccountsIfMissing(get) {
  const prev = get();
  let list = Array.isArray(prev.accounts) ? [...prev.accounts] : [];
  if (list.length === 0 && prev.user && prev.token) {
    const id = normalizeAccountId(prev.user?.id ?? prev.user?._id);
    if (id) {
      list = [{ id, user: prev.user, token: prev.token, isAuthenticated: true }];
    }
  }
  return dedupeAccountsById(list);
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      accounts: [],
      currentAccountId: null,

      /** Gọi sau khi hydrate (ProtectedRoute) để gom phiên cũ thiếu accounts và bỏ trùng id. */
      reconcileAccounts: () => {
        const prev = get();
        if (!prev.user || !prev.token) return;
        const list = dedupeAccountsById(seedAccountsIfMissing(get));
        const cur = normalizeAccountId(prev.currentAccountId ?? prev.user?.id ?? prev.user?._id);
        const currentOk = cur && list.some((a) => normalizeAccountId(a.id) === cur);
        set({
          accounts: list,
          currentAccountId: currentOk ? cur : list[0]?.id || null
        });
      },

      login: async (email, password) => {
        try {
          let prevAccounts = seedAccountsIfMissing(get);

          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data;

          const accountId = normalizeAccountId(user?.id ?? user?._id);
          if (!accountId) {
            return { success: false, message: 'Phản hồi đăng nhập không hợp lệ (thiếu id người dùng)' };
          }

          const newAccount = {
            id: accountId,
            user,
            token,
            isAuthenticated: true
          };

          const existingIndex = prevAccounts.findIndex((acc) => normalizeAccountId(acc.id) === accountId);
          let updatedAccounts;
          if (existingIndex >= 0) {
            updatedAccounts = [...prevAccounts];
            updatedAccounts[existingIndex] = newAccount;
          } else {
            updatedAccounts = [...prevAccounts, newAccount];
          }
          updatedAccounts = dedupeAccountsById(updatedAccounts);

          set({
            user,
            token,
            isAuthenticated: true,
            accounts: updatedAccounts,
            currentAccountId: accountId
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Lỗi đăng nhập'
          };
        }
      },

      register: async (userData) => {
        try {
          let prevAccounts = seedAccountsIfMissing(get);

          const response = await api.post('/auth/register', userData);
          const { user, token } = response.data;

          const accountId = normalizeAccountId(user?.id ?? user?._id);
          if (!accountId) {
            return { success: false, message: 'Phản hồi đăng ký không hợp lệ' };
          }

          const newAccount = {
            id: accountId,
            user,
            token,
            isAuthenticated: true
          };

          const existingIndex = prevAccounts.findIndex((acc) => normalizeAccountId(acc.id) === accountId);
          const merged =
            existingIndex >= 0
              ? dedupeAccountsById(
                  prevAccounts.map((a, i) => (i === existingIndex ? newAccount : a))
                )
              : dedupeAccountsById([...prevAccounts, newAccount]);

          set({
            user,
            token,
            isAuthenticated: true,
            accounts: merged,
            currentAccountId: accountId
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            message: error.response?.data?.message || 'Lỗi đăng ký'
          };
        }
      },

      logout: async (logoutAll = false) => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          if (logoutAll) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              accounts: [],
              currentAccountId: null
            });
          } else {
            const currentAccountId = normalizeAccountId(get().currentAccountId);
            const accounts = (get().accounts || []).filter(
              (acc) => normalizeAccountId(acc.id) !== currentAccountId
            );

            if (accounts.length > 0) {
              const firstAccount = accounts[0];
              set({
                user: firstAccount.user,
                token: firstAccount.token,
                isAuthenticated: true,
                accounts,
                currentAccountId: normalizeAccountId(firstAccount.id)
              });
            } else {
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                accounts: [],
                currentAccountId: null
              });
            }
          }
        }
      },

      switchAccount: (accountId) => {
        const id = normalizeAccountId(accountId);
        const accounts = get().accounts || [];
        const account = accounts.find((acc) => normalizeAccountId(acc.id) === id);

        if (account) {
          set({
            user: account.user,
            token: account.token,
            isAuthenticated: account.isAuthenticated,
            currentAccountId: id
          });
          return true;
        }
        return false;
      },

      removeAccount: async (accountId) => {
        const id = normalizeAccountId(accountId);
        const accounts = (get().accounts || []).filter((acc) => normalizeAccountId(acc.id) !== id);
        const currentAccountId = normalizeAccountId(get().currentAccountId);

        if (id === currentAccountId) {
          if (accounts.length > 0) {
            const firstAccount = accounts[0];
            set({
              user: firstAccount.user,
              token: firstAccount.token,
              isAuthenticated: true,
              accounts,
              currentAccountId: normalizeAccountId(firstAccount.id)
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              accounts: [],
              currentAccountId: null
            });
          }
        } else {
          set({ accounts });
        }
      },

      updateUser: (userData) => {
        const currentAccountId = normalizeAccountId(get().currentAccountId);
        const accounts = get().accounts || [];

        const updatedUser = { ...get().user, ...userData };

        const updatedAccounts = accounts.map((acc) =>
          normalizeAccountId(acc.id) === currentAccountId ? { ...acc, user: updatedUser } : acc
        );

        set(() => ({
          user: updatedUser,
          accounts: updatedAccounts
        }));
      },

      checkAuth: async () => {
        try {
          const response = await api.get('/auth/me');
          const currentAccountId = normalizeAccountId(get().currentAccountId);
          const accounts = get().accounts || [];

          const updatedAccounts = accounts.map((acc) =>
            normalizeAccountId(acc.id) === currentAccountId
              ? { ...acc, user: response.data.user }
              : acc
          );

          set({
            user: response.data.user,
            isAuthenticated: true,
            accounts: updatedAccounts
          });
          return true;
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false
          });
          return false;
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accounts: state.accounts,
        currentAccountId: state.currentAccountId
      })
    }
  )
);
