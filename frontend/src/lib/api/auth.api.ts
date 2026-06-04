import { AuthResponse, LoginCredentials, RegisterData, User, UserRole } from "@/types/user.types";
import { ApiResponse } from "@/types/api.types";
import apiClient from "./client";

// ============================================
// USE MOCK FLAG — set false when backend ready
// ============================================
const USE_MOCK = false; 

// ============================================
// MOCK ACCOUNTS — hardcoded for UI testing
// ============================================
const MOCK_ACCOUNTS = [
  {
    email: "user@gmail.com",
    password: "123456",
    user: {
      id: "usr_001",
      email: "user@gmail.com",
      fullName: "Nguyễn Văn A",
      phone: "0901234567",
      avatar: null,
      role: UserRole.CUSTOMER,
      isActive: true,
      addresses: [],
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    } satisfies User,
    token: "fake-jwt-token-user-123",
  },
  {
    email: "admin@gmail.com",
    password: "123456",
    user: {
      id: "usr_admin_001",
      email: "admin@gmail.com",
      fullName: "Nguyễn Văn A",
      phone: "0909999999",
      avatar: null,
      role: UserRole.ADMIN,
      isActive: true,
      addresses: [],
      createdAt: "2023-06-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    } satisfies User,
    token: "fake-jwt-token-admin-456",
  },
];

// ============================================
// HELPER — simulate network latency
// ============================================
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================
// API FUNCTIONS
// ============================================

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  if (USE_MOCK) {
    await delay(1000); // Simulate 1s network latency
    const account = MOCK_ACCOUNTS.find(
      (a) => a.email === credentials.email && a.password === credentials.password
    );
    if (!account) {
      throw new Error("Email hoặc mật khẩu không chính xác");
    }
    return { accessToken: account.token, user: account.user };
  }
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/login", credentials);
  return data.data;
}

export async function registerApi(registerData: RegisterData): Promise<AuthResponse> {
  if (USE_MOCK) {
    await delay(800);
    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: registerData.email,
      fullName: registerData.fullName,
      phone: registerData.phone,
      avatar: null,
      role: UserRole.CUSTOMER,
      isActive: true,
      addresses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { accessToken: "fake-jwt-token-new-user", user: newUser };
  }
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/register", registerData);
  return data.data;
}

export async function logoutApi(): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    return;
  }
  await apiClient.post("/auth/logout");
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  if (USE_MOCK) {
    await delay(300);
    return {
      accessToken: "fake-jwt-token-refreshed",
      user: MOCK_ACCOUNTS[0].user,
    };
  }
  const { data } = await apiClient.post<ApiResponse<AuthResponse>>("/auth/refresh");
  return data.data;
}

export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  if (USE_MOCK) {
    await delay(800);
    return { message: "Đã gửi link đặt lại mật khẩu đến email của bạn" };
  }
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>("/auth/forgot-password", {
    email,
  });
  return data.data;
}

export async function resetPasswordApi(token: string, password: string): Promise<{ message: string }> {
  if (USE_MOCK) {
    await delay(800);
    return { message: "Đặt lại mật khẩu thành công" };
  }
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>("/auth/reset-password", {
    token,
    password,
  });
  return data.data;
}

export async function getProfileApi(): Promise<User> {
  if (USE_MOCK) {
    await delay(500);
    return MOCK_ACCOUNTS[0].user;
  }
  const { data } = await apiClient.get<ApiResponse<User>>("/auth/profile");
  return data.data;
}
