// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────
// Decks
// ─────────────────────────────────────────────────────────────
export interface Deck {
  id: string;
  name: string;
  description: string | null;
  cardCount: number;
  dueCount?: number;
  newCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeckDetail extends Deck {
  cards: CardWithProgress[];
}

// ─────────────────────────────────────────────────────────────
// Cards
// ─────────────────────────────────────────────────────────────
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CardProgress {
  cardId: string;
  userId: string;
  state: CardState;
  dueDate: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt: string | null;
}

export interface CardWithProgress extends Card {
  progress?: CardProgress;
}

// ─────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type SessionStatus = 'active' | 'completed' | 'abandoned';

export interface CreateSessionResponse {
  sessionId: string;
  totalCards: number;
  newCards: number;
  dueCards: number;
  resumed?: boolean;
}

/** FR-014: back field is intentionally ABSENT */
export interface NextCardResponse {
  done: false;
  card: {
    id: string;
    front: string;
    deckId: string;
  };
  position: number;
  total: number;
}

export interface SessionDoneResponse {
  done: true;
}

export type GetNextCardResponse = NextCardResponse | SessionDoneResponse;

export interface RateCardResponse {
  nextInterval: number;
  nextDueDate: string;
  nextState: CardState;
  easeFactor: number;
}

export interface SessionSummary {
  sessionId: string;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  cardsStudied: number;
  ratings: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  averageEaseFactor: number;
  retentionRate: number;
}

// ─────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  dueToday: number;
  newCards: number;
  retentionRate: number;
  streak: number;
  totalCards: number;
  totalDecks: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface ForecastDay {
  date: string;
  count: number;
}

export interface RetentionPoint {
  date: string;
  rate: number;
}

export interface DeckStats {
  deckId: string;
  deckName: string;
  states: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  lastStudied: string | null;
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────
export interface UserSettings {
  id: string;
  userId: string;
  dailyNewCardsLimit: number;
  timezone: string;
  reminderEnabled: boolean;
  reminderTime: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  webPushSubscription: object | null;
}

// ─────────────────────────────────────────────────────────────
// API envelope
// ─────────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  status: 'success';
  data: T;
}

export interface ApiError {
  status: 'error';
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────────────────────
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}
