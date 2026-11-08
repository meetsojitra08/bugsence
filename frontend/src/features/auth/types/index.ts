export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
}
