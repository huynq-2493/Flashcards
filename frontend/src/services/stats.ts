import { api } from '@/lib/api';
import type {
  ApiSuccess,
  DashboardStats,
  HeatmapDay,
  ForecastDay,
  RetentionPoint,
  DeckStats,
} from '@/types/api';

export const statsService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await api.get<ApiSuccess<DashboardStats>>('/stats/dashboard');
    return res.data.data;
  },

  async getHeatmap(days = 90): Promise<HeatmapDay[]> {
    const res = await api.get<ApiSuccess<HeatmapDay[]>>('/stats/heatmap', {
      params: { days },
    });
    return res.data.data;
  },

  async getForecast(days = 30): Promise<ForecastDay[]> {
    const res = await api.get<ApiSuccess<ForecastDay[]>>('/stats/forecast', {
      params: { days },
    });
    return res.data.data;
  },

  async getRetentionTrend(days = 30): Promise<RetentionPoint[]> {
    const res = await api.get<ApiSuccess<RetentionPoint[]>>('/stats/retention', {
      params: { days },
    });
    return res.data.data;
  },

  async getDeckStats(deckId: string): Promise<DeckStats> {
    const res = await api.get<ApiSuccess<DeckStats>>(`/stats/decks/${deckId}`);
    return res.data.data;
  },
};
