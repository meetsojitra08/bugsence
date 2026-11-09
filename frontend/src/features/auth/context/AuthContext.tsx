import React, { createContext, useCallback, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import type { LoginPayload, RegisterPayload, User } from "../types";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/apiClient";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: User) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const response = await authApi.login(payload);
    setUser(response.user);
  };

  const register = async (payload: RegisterPayload) => {
    const response = await authApi.register(payload);
    setUser(response.user);
  };

  const logout = async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // Continue clearing local state even if server logout fails
      }
    }
    clearTokens();
    setUser(null);
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
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
