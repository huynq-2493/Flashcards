import { api } from '@/lib/api';
import type { ApiSuccess, UserSettings } from '@/types/api';

export const settingsService = {
  async getSettings(): Promise<UserSettings> {
    const res = await api.get<ApiSuccess<UserSettings>>('/settings');
    return res.data.data;
  },

  async updateSettings(data: Partial<Omit<UserSettings, 'id' | 'userId'>>): Promise<UserSettings> {
    const res = await api.patch<ApiSuccess<UserSettings>>('/settings', data);
    return res.data.data;
  },

  async subscribePush(subscription: PushSubscriptionJSON): Promise<void> {
    await api.post('/settings/notifications/subscribe', { subscription });
  },
};
