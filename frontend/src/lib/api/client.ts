import axios from 'axios';
import { API_BASE_URL } from '../constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = window.__BALII_ACCESS_TOKEN__;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const sessionId = window.localStorage.getItem('balii-session-id');
      if (sessionId) {
        config.headers['x-session-id'] = sessionId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url ?? '');
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = window.__BALII_REFRESH_TOKEN__;
        const userId = window.__BALII_USER_ID__;

        if (!refreshToken || !userId) {
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }

        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { userId, refreshToken },
          { withCredentials: true },
        );

        const newAccessToken = data.accessToken;

        if (typeof window !== 'undefined') {
          window.__BALII_ACCESS_TOKEN__ = newAccessToken;
          window.__BALII_REFRESH_TOKEN__ = data.refreshToken;
          window.__BALII_USER_ID__ = data.user?.id ?? userId;
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          window.__BALII_ACCESS_TOKEN__ = undefined;
          window.__BALII_REFRESH_TOKEN__ = undefined;
          window.__BALII_USER_ID__ = undefined;
        }

        return Promise.reject(
          enrichErrorMessage(refreshError, requestUrl, false),
        );
      }
    }

    return Promise.reject(enrichErrorMessage(error, requestUrl, isAuthRequest));
  },
);

function enrichErrorMessage(
  error: unknown,
  requestUrl: string,
  isAuthRequest: boolean,
) {
  const resolvedMessage = normalizeApiErrorMessage(
    error,
    requestUrl,
    isAuthRequest,
  );

  if (error instanceof Error) {
    error.message = resolvedMessage;
    return error;
  }

  return new Error(resolvedMessage);
}

function normalizeApiErrorMessage(
  error: unknown,
  requestUrl: string,
  isAuthRequest: boolean,
): string {
  const apiError = error as {
    code?: string;
    response?: {
      status?: number;
    };
  };

  if (apiError.code === 'ECONNABORTED') {
    return 'Hệ thống đang phản hồi chậm. Vui lòng thử lại sau ít phút.';
  }

  if (!apiError.response) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }

  const status = apiError.response.status ?? 0;

  if (status === 400) {
    if (requestUrl.includes('/auth/register')) {
      return 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.';
    }

    return 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.';
  }

  if (status === 401) {
    if (isAuthRequest) {
      return 'Email hoặc mật khẩu không đúng.';
    }

    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }

  if (status === 404) {
    if (requestUrl.includes('/orders')) {
      return 'Không tìm thấy đơn hàng.';
    }

    if (requestUrl.includes('/products')) {
      return 'Không tìm thấy sản phẩm.';
    }

    if (requestUrl.includes('/users/me/addresses')) {
      return 'Không tìm thấy địa chỉ.';
    }

    return 'Không tìm thấy dữ liệu yêu cầu.';
  }

  if (status === 409) {
    if (requestUrl.includes('/auth/register')) {
      return 'Email hoặc số điện thoại đã tồn tại.';
    }

    return 'Dữ liệu đang xung đột. Vui lòng kiểm tra lại.';
  }

  if (status === 422) {
    if (requestUrl.includes('/users/me/addresses')) {
      return 'Thông tin địa chỉ chưa hợp lệ. Vui lòng kiểm tra lại.';
    }

    return 'Thông tin bạn nhập chưa hợp lệ. Vui lòng kiểm tra lại.';
  }

  if (status >= 500) {
    return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

export default apiClient;

declare global {
  interface Window {
    __BALII_ACCESS_TOKEN__?: string;
    __BALII_REFRESH_TOKEN__?: string;
    __BALII_USER_ID__?: string;
  }
}
