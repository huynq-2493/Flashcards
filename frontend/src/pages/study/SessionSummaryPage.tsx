
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionsService } from '@/services/sessions';
import { Button } from '@/components/ui/Button';
import type { Rating } from '@/types/api';

const ratingColors: Record<Rating, string> = {
  again: 'text-again',
  hard: 'text-hard',
  good: 'text-good',
  easy: 'text-easy',
};

function CircleStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full bg-indigo-50 border-4 border-indigo-100">
        <span className="text-xl font-bold text-indigo-700">{value || 0}</span>
      </div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function SessionSummaryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['session-summary', sessionId],
    queryFn: () => sessionsService.getSessionSummary(sessionId!),
    enabled: !!sessionId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Session not found.</p>
        <Link to="/" className="text-indigo-600 hover:underline text-sm mt-2 inline-block">
          Go home
        </Link>
      </div>
    );
  }

  const durationMs = summary.completedAt
    ? new Date(summary.completedAt).getTime() - new Date(summary.startedAt).getTime()
    : 0;
  const durationMin = Math.round(durationMs / 60000);

  const totalRatings =
    summary.ratings.again + summary.ratings.hard + summary.ratings.good + summary.ratings.easy;

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Session Complete!</h1>
        <p className="text-gray-500 mt-1">Great work on your study session.</p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex justify-around">
          <CircleStat label="Cards studied" value={summary.cardsStudied} />
          <CircleStat label="Retention" value={`${summary.retentionRate}%`} />
          <CircleStat label="Duration" value={`${durationMin}m`} />
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Rating Breakdown
        </h2>
        <div className="space-y-2">
          {(['again', 'hard', 'good', 'easy'] as Rating[]).map((r) => {
            const count = summary.ratings[r];
            const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
            return (
              <div key={r} className="flex items-center gap-3">
                <span className={`w-14 text-xs font-semibold capitalize ${ratingColors[r]}`}>
                  {r}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      r === 'again'
                        ? 'bg-again'
                        : r === 'hard'
                        ? 'bg-hard'
                        : r === 'good'
                        ? 'bg-good'
                        : 'bg-easy'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="secondary" onClick={() => navigate('/')}>
          Dashboard
        </Button>
        <Button onClick={() => navigate(-2)}>Study Again</Button>
      </div>
    </div>
  );
}
