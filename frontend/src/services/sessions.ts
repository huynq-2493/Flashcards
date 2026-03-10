import { api } from '@/lib/api';
import type {
  ApiSuccess,
  CreateSessionResponse,
  GetNextCardResponse,
  RateCardResponse,
  Rating,
  SessionSummary,
} from '@/types/api';

export const sessionsService = {
  async createSession(deckId: string): Promise<CreateSessionResponse> {
    const res = await api.post<ApiSuccess<CreateSessionResponse>>('/sessions', { deckId });
    return res.data.data;
  },

  async getNextCard(sessionId: string): Promise<GetNextCardResponse> {
    const res = await api.get<ApiSuccess<GetNextCardResponse>>(
      `/sessions/${sessionId}/next-card`,
    );
    return res.data.data;
  },

  async rateCard(sessionId: string, cardId: string, rating: Rating): Promise<RateCardResponse> {
    const res = await api.post<ApiSuccess<RateCardResponse>>(`/sessions/${sessionId}/rate`, {
      cardId,
      rating,
    });
    return res.data.data;
  },

  async completeSession(sessionId: string): Promise<SessionSummary> {
    const res = await api.post<ApiSuccess<SessionSummary>>(`/sessions/${sessionId}/complete`);
    return res.data.data;
  },

  async abandonSession(sessionId: string): Promise<void> {
    await api.post(`/sessions/${sessionId}/abandon`);
  },

  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    const res = await api.get<ApiSuccess<SessionSummary>>(`/sessions/${sessionId}/summary`);
    return res.data.data;
  },
};
