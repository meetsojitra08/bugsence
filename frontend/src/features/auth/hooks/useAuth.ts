import { useContext } from "react";
import { AuthContext, type AuthContextType } from "../context/AuthContext";

const FALLBACK_AUTH_CONTEXT: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  loginAsDemo: async () => {},
  updateUser: () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return FALLBACK_AUTH_CONTEXT;
  }
  return context;
}
