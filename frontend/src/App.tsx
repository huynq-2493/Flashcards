import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedLayout, AuthLayout } from './components/layout/Layouts';

// Auth pages – small, loaded eagerly
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// App pages – lazy loaded
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const DeckListPage = lazy(() => import('./pages/decks/DeckListPage'));
const DeckDetailPage = lazy(() => import('./pages/decks/DeckDetailPage'));
const CardEditorPage = lazy(() => import('./pages/cards/CardEditorPage'));
const StudySessionPage = lazy(() => import('./pages/study/StudySessionPage'));
const SessionSummaryPage = lazy(() => import('./pages/study/SessionSummaryPage'));
const StatsPage = lazy(() => import('./pages/stats/StatsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public / Auth */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/decks" element={<DeckListPage />} />
          <Route path="/decks/:deckId" element={<DeckDetailPage />} />
          <Route path="/decks/:deckId/cards/new" element={<CardEditorPage />} />
          <Route path="/decks/:deckId/cards/:cardId/edit" element={<CardEditorPage />} />
          <Route path="/decks/:deckId/study" element={<StudySessionPage />} />
          <Route path="/sessions/:sessionId/summary" element={<SessionSummaryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Suspense>
  );
}
