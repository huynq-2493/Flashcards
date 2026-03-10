import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statsService } from '@/services/stats';

// Lazy-load Recharts to keep initial bundle small
const LazyCharts = lazy(() => import('./StatsCharts'));

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 animate-pulse rounded-lg ${className}`} />;
}

export default function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsService.getDashboardStats(),
  });

  const { data: heatmap = [], isLoading: heatLoading } = useQuery({
    queryKey: ['heatmap'],
    queryFn: () => statsService.getHeatmap(90),
  });

  const { data: forecast = [], isLoading: forecastLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => statsService.getForecast(30),
  });

  const { data: retention = [], isLoading: retentionLoading } = useQuery({
    queryKey: ['retention'],
    queryFn: () => statsService.getRetentionTrend(30),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
        <p className="text-gray-500 text-sm mt-1">Your learning progress at a glance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : [
              { label: 'Due Today', value: stats?.dueToday ?? 0 },
              { label: 'Streak', value: `${stats?.streak ?? 0} 🔥` },
              { label: 'Retention', value: `${stats?.retentionRate ?? 0}%` },
              { label: 'Total Cards', value: stats?.totalCards ?? 0 },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white rounded-xl border shadow-sm p-5 text-center"
              >
                <p className="text-2xl font-bold text-indigo-700">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
      </div>

      {/* Charts (lazy) */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        }
      >
        <LazyCharts
          heatmap={heatmap}
          forecast={forecast}
          retention={retention}
          heatLoading={heatLoading}
          forecastLoading={forecastLoading}
          retentionLoading={retentionLoading}
        />
      </Suspense>
    </div>
  );
}
