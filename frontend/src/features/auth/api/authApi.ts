import { apiRequest, clearTokens, setTokens } from "@/lib/apiClient";
import type {
  AuthResponse,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from "../types";

interface RawUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

interface RawAuthResponse {
  access: string;
  refresh: string;
  user: RawUser;
}

function mapUser(raw: RawUser): User {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    avatarUrl: raw.avatar_url,
    displayName: raw.display_name,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const raw = await apiRequest<RawAuthResponse>("/auth/register/", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        full_name: payload.fullName || "",
      }),
    });

    setTokens(raw.access, raw.refresh);
    return {
      access: raw.access,
      refresh: raw.refresh,
      user: mapUser(raw.user),
    };
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const raw = await apiRequest<RawAuthResponse>("/auth/login/", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    });

    setTokens(raw.access, raw.refresh);
    return {
      access: raw.access,
      refresh: raw.refresh,
      user: mapUser(raw.user),
    };
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiRequest("/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } finally {
      clearTokens();
    }
  },

  async getMe(): Promise<User> {
    const raw = await apiRequest<RawUser>("/users/me/");
    return mapUser(raw);
  },

  async updateMe(payload: UpdateProfilePayload): Promise<User> {
    const body: Record<string, string> = {};
    if (payload.fullName !== undefined) body.full_name = payload.fullName;
    if (payload.avatarUrl !== undefined) body.avatar_url = payload.avatarUrl;

    const raw = await apiRequest<RawUser>("/users/me/", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return mapUser(raw);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/users/me/change-password/", {
      method: "POST",
      body: JSON.stringify({
        old_password: payload.oldPassword,
        new_password: payload.newPassword,
      }),
    });
  },
};
