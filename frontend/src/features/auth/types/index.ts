export type NotificationChannelMap = {
  in_app: boolean;
  email: boolean;
  slack: boolean;
};

export type NotificationPreferences = {
  assigned: NotificationChannelMap;
  mention: NotificationChannelMap;
  pr_status: NotificationChannelMap;
  inbox_arrival: NotificationChannelMap;
  resolved: NotificationChannelMap;
};

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  timezone?: string;
  notificationPreferences?: NotificationPreferences;
  lastActiveAt?: string | null;
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
  project?: { id: string; key: string; name: string };
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
  timezone?: string;
  notificationPreferences?: NotificationPreferences;
}
