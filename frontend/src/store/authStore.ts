import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  username: string | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  setAuth: (username: string, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      username: null,
      accessToken: null,
      isLoggedIn: false,
      setAuth: (username, accessToken) =>
        set({ username, accessToken, isLoggedIn: true }),
      logout: () => set({ username: null, accessToken: null, isLoggedIn: false }),
    }),
    {
      name: "kozan-auth",
      partialize: (state) => ({
        username: state.username,
        accessToken: state.accessToken,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
