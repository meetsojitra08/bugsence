import React, { createContext, useCallback, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import type { LoginPayload, RegisterPayload, User } from "../types";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/apiClient";
import { disableDemoSession, enableDemoSession, isDemoSession } from "@/lib/demo";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  updateUser: (updated: User) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@bugsense.dev",
  fullName: "Demo Engineer",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80",
  displayName: "Demo Engineer",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (token.startsWith("demo_")) {
      // Any demo token implies a demo session, even if the flag was lost on reload.
      enableDemoSession();
      setUser(DEMO_USER);
      setIsLoading(false);
      return;
    }

    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();

    const handleAuthExpired = () => {
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener("bugsense-auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("bugsense-auth-expired", handleAuthExpired);
    };
  }, [fetchCurrentUser]);

  const login = async (payload: LoginPayload) => {
    disableDemoSession();
    const response = await authApi.login(payload);
    setUser(response.user);
  };

  const register = async (payload: RegisterPayload) => {
    disableDemoSession();
    const response = await authApi.register(payload);
    setUser(response.user);
  };

  const logout = async () => {
    const refresh = getRefreshToken();
    const demo = isDemoSession();
    if (refresh && !refresh.startsWith("demo_") && !demo) {
      try {
        await authApi.logout(refresh);
      } catch {
        // Continue clearing local state even if server logout fails
      }
    }
    clearTokens();
    disableDemoSession();
    setUser(null);
  };

  const loginAsDemo = async () => {
    setTokens("demo_access_token", "demo_refresh_token");
    enableDemoSession();
    setUser(DEMO_USER);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        loginAsDemo,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
