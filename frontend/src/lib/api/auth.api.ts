import apiClient from './client';
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from '@/types/user.types';
import { mapUser } from './adapters';
import { getMyAddresses } from './addresses.api';
import { mergeGuestCartApi } from './cart.api';

type BackendAuthUser = Parameters<typeof mapUser>[0];

type BackendAuthResponse = {
  accessToken: string;
  user: BackendAuthUser;
};

export async function loginApi(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<BackendAuthResponse>(
    '/auth/login',
    credentials,
  );

  if (typeof window !== 'undefined') {
    window.__BALII_ACCESS_TOKEN__ = data.accessToken;
    window.__BALII_USER_ID__ = data.user?.id;
  }

  await mergeGuestCartApi().catch(() => null);

  const addresses = await getMyAddresses().catch(() => []);

  return {
    accessToken: data.accessToken,
    user: mapUser(data.user, addresses),
  };
}

export async function registerApi(registerData: RegisterData): Promise<{
  message: string;
  userId: string;
  requiresEmailVerification: boolean;
}> {
  const payload = {
    email: registerData.email,
    password: registerData.password,
    fullName: registerData.fullName,
    phone: registerData.phone || undefined,
  };
  const { data } = await apiClient.post<{
    message: string;
    userId: string;
    requiresEmailVerification: boolean;
  }>('/auth/register', payload);
  return data;
}

export async function verifyEmailApi(
  token: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.get<{ message: string }>(
    '/auth/verify-email',
    { params: { token } },
  );
  return data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  if (typeof window === 'undefined') {
    throw new Error(
      'Không thể làm mới phiên đăng nhập trong môi trường hiện tại.',
    );
  }

  const { data } = await apiClient.post<BackendAuthResponse>(
    '/auth/refresh',
    {},
    { withCredentials: true },
  );

  window.__BALII_ACCESS_TOKEN__ = data.accessToken;
  window.__BALII_USER_ID__ = data.user.id;

  const addresses = await getMyAddresses().catch(() => []);

  return {
    accessToken: data.accessToken,
    user: mapUser(data.user, addresses),
  };
}

export async function forgotPasswordApi(
  email: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    '/auth/forgot-password',
    { email },
  );
  return data;
}

export async function resetPasswordApi(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(
    '/auth/reset-password',
    { token, newPassword },
  );
  return data;
}

export async function getProfileApi(): Promise<User> {
  const { data } = await apiClient.get<BackendAuthUser>('/users/me');
  const addresses = await getMyAddresses().catch(() => []);
  return mapUser(data, addresses);
}

export async function updateProfileApi(payload: {
  fullName: string;
  phone: string;
  avatarUrl?: string;
}): Promise<User> {
  const { data } = await apiClient.patch<BackendAuthUser>('/users/me', payload);
  const addresses = await getMyAddresses().catch(() => []);
  return mapUser(data, addresses);
}
