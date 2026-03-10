import { api } from '@/lib/api';
import type { ApiSuccess, Deck, Card, CardProgress, ImportResult } from '@/types/api';

export const decksService = {
  // ── Decks ──────────────────────────────────────────────────

  async listDecks(): Promise<Deck[]> {
    const res = await api.get<ApiSuccess<Deck[]>>('/decks');
    return res.data.data;
  },

  async createDeck(name: string, description?: string): Promise<Deck> {
    const res = await api.post<ApiSuccess<Deck>>('/decks', { name, description });
    return res.data.data;
  },

  async getDeck(deckId: string): Promise<Deck> {
    const res = await api.get<ApiSuccess<Deck>>(`/decks/${deckId}`);
    return res.data.data;
  },

  async updateDeck(deckId: string, data: { name?: string; description?: string }): Promise<Deck> {
    const res = await api.patch<ApiSuccess<Deck>>(`/decks/${deckId}`, data);
    return res.data.data;
  },

  async deleteDeck(deckId: string): Promise<void> {
    await api.delete(`/decks/${deckId}`);
  },

  async exportDeckAsCsv(deckId: string, deckName: string): Promise<void> {
    const res = await api.get(`/decks/${deckId}/export`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deckName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Cards ──────────────────────────────────────────────────

  async listCards(deckId: string): Promise<Card[]> {
    const res = await api.get<ApiSuccess<Card[]>>(`/decks/${deckId}/cards`);
    return res.data.data;
  },

  async createCard(deckId: string, front: string, back: string, tags?: string[]): Promise<Card> {
    const res = await api.post<ApiSuccess<Card>>(`/decks/${deckId}/cards`, {
      front,
      back,
      tags: tags ?? [],
    });
    return res.data.data;
  },

  async updateCard(
    deckId: string,
    cardId: string,
    data: { front?: string; back?: string; tags?: string[] },
  ): Promise<Card> {
    const res = await api.patch<ApiSuccess<Card>>(`/decks/${deckId}/cards/${cardId}`, data);
    return res.data.data;
  },

  async deleteCard(deckId: string, cardId: string): Promise<void> {
    await api.delete(`/decks/${deckId}/cards/${cardId}`);
  },

  async getCardProgress(deckId: string, cardId: string): Promise<CardProgress> {
    const res = await api.get<ApiSuccess<CardProgress>>(
      `/decks/${deckId}/cards/${cardId}/progress`,
    );
    return res.data.data;
  },

  async importCsv(deckId: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiSuccess<ImportResult>>(`/decks/${deckId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};
