import apiClient from './client';
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
} from '@/types/user.types';
import { mapUser } from './adapters';
import { getMyAddresses } from './addresses.api';

export async function loginApi(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/login', credentials);

  if (typeof window !== 'undefined') {
    window.__BALII_ACCESS_TOKEN__ = data.accessToken;
    window.__BALII_REFRESH_TOKEN__ = data.refreshToken;
    window.__BALII_USER_ID__ = data.user?.id;
  }

  const addresses = await getMyAddresses().catch(() => []);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: mapUser(data.user, addresses),
  };
}

export async function registerApi(
  registerData: RegisterData,
): Promise<AuthResponse> {
  await apiClient.post('/auth/register', registerData);
  return loginApi({
    email: registerData.email,
    password: registerData.password,
  });
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

  const refreshToken = window.__BALII_REFRESH_TOKEN__;
  const userId = window.__BALII_USER_ID__;

  if (!refreshToken || !userId) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const { data } = await apiClient.post('/auth/refresh', {
    userId,
    refreshToken,
  });

  window.__BALII_ACCESS_TOKEN__ = data.accessToken;
  window.__BALII_REFRESH_TOKEN__ = data.refreshToken;
  window.__BALII_USER_ID__ = data.user?.id ?? userId;

  const addresses = await getMyAddresses().catch(() => []);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: mapUser(data.user, addresses),
  };
}

export async function forgotPasswordApi(
  email: string,
): Promise<{ message: string }> {
  return {
    message: `Tính năng quên mật khẩu chưa được hỗ trợ. Vui lòng liên hệ hỗ trợ cho ${email}.`,
  };
}

export async function resetPasswordApi(): Promise<{ message: string }> {
  return {
    message: 'Tính năng đặt lại mật khẩu chưa được hỗ trợ trên hệ thống này.',
  };
}

export async function getProfileApi(): Promise<User> {
  const { data } = await apiClient.get('/users/me');
  const addresses = await getMyAddresses().catch(() => []);
  return mapUser(data, addresses);
}
