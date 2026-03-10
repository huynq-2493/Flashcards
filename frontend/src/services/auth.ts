import { api } from '@/lib/api';
import type { AuthResponse, ApiSuccess } from '@/types/api';

export const authService = {
  async register(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<ApiSuccess<AuthResponse>>('/auth/register', { email, password });
    return res.data.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<ApiSuccess<AuthResponse>>('/auth/login', { email, password });
    return res.data.data;
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await api.post<ApiSuccess<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken },
    );
    return res.data.data;
  },

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },
};
