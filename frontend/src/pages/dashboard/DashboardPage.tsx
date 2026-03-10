
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '@/services/stats';
import { decksService } from '@/services/decks';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';

function StatCard({
  label,
  value,
  sub,
  color = 'indigo',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
  };
  const labelColors: Record<string, string> = {
    indigo: 'text-indigo-800',
    green: 'text-green-800',
    yellow: 'text-yellow-800',
    teal: 'text-teal-800',
  };
  const subColors: Record<string, string> = {
    indigo: 'text-indigo-700',
    green: 'text-green-700',
    yellow: 'text-yellow-700',
    teal: 'text-teal-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] ?? colors.indigo}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${labelColors[color] ?? labelColors.indigo}`}>{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className={`text-xs mt-1 ${subColors[color] ?? subColors.indigo}`}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboardStats(),
    refetchInterval: 60_000,
  });

  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: () => decksService.listDecks(),
  });

  const dueDecks = decks?.filter((d) => (d.dueCount ?? 0) > 0 || (d.newCount ?? 0) > 0) ?? [];

  return (
    <>
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()},{' '}
          <span className="text-indigo-600">{user?.email.split('@')[0]}</span> 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your learning summary for today.</p>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-gray-100 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Due Today"
            value={stats?.dueToday ?? 0}
            sub="cards to review"
            color="indigo"
          />
          <StatCard
            label="New Cards"
            value={stats?.newCards ?? 0}
            sub="available to learn"
            color="yellow"
          />
          <StatCard
            label="Retention"
            value={`${stats?.retentionRate ?? 0}%`}
            sub="30-day average"
            color="green"
          />
          <StatCard
            label="Streak"
            value={`${stats?.streak ?? 0} 🔥`}
            sub="days in a row"
            color="teal"
          />
        </div>
      )}

      {/* Due decks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ready to Study</h2>
          <Link to="/decks" className="text-sm text-indigo-600 hover:underline">
            All decks →
          </Link>
        </div>

        {decksLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-gray-100 animate-pulse h-20" />
            ))}
          </div>
        ) : dueDecks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-600 text-sm">🎉 All caught up! No cards due right now.</p>
            <Link
              to="/decks"
              className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
            >
              Browse your decks →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dueDecks.map((deck) => (
              <div
                key={deck.id}
                className="bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="font-semibold text-gray-900 truncate">{deck.name}</h3>
                  {deck.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{deck.description}</p>
                  )}
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  {(deck.dueCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                      {deck.dueCount} due
                    </span>
                  )}
                  {(deck.newCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-yellow-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                      {deck.newCount} new
                    </span>
                  )}
                </div>
                <Link
                  to={`/decks/${deck.id}/study`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 transition-colors"
                >
                  Study now →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    <OnboardingOverlay />
    </>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
