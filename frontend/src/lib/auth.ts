import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { authApi } from "./api";

interface User {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  is_verified: boolean;
  tokens_used_this_month: number;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          const { access_token, refresh_token, user } = response.data;

          Cookies.set("access_token", access_token, { expires: 1 });
          Cookies.set("refresh_token", refresh_token, { expires: 7 });

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name?: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register({ email, password, name });
          const { access_token, refresh_token, user } = response.data;

          Cookies.set("access_token", access_token, { expires: 1 });
          Cookies.set("refresh_token", refresh_token, { expires: 7 });

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        set({ user: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        const token = Cookies.get("access_token");
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.me();
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } catch {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
