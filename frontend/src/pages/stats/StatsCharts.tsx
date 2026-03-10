/**
 * StatsCharts — lazy-loaded Recharts bundle.
 * Imported via React.lazy() in StatsPage.tsx
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { HeatmapDay, ForecastDay, RetentionPoint } from '@/types/api';

interface Props {
  heatmap: HeatmapDay[];
  forecast: ForecastDay[];
  retention: RetentionPoint[];
  heatLoading: boolean;
  forecastLoading: boolean;
  retentionLoading: boolean;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

/** Render a mini-heatmap using colored cells */
function Heatmap({ days }: { days: HeatmapDay[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);

  const intensity = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    const pct = count / max;
    if (pct < 0.25) return 'bg-indigo-200';
    if (pct < 0.5) return 'bg-indigo-400';
    if (pct < 0.75) return 'bg-indigo-600';
    return 'bg-indigo-800';
  };

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.count} reviews`}
          className={`w-4 h-4 rounded-sm ${intensity(d.count)}`}
        />
      ))}
    </div>
  );
}

export default function StatsCharts({
  heatmap,
  forecast,
  retention,
  heatLoading,
  forecastLoading,
  retentionLoading,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Activity heatmap */}
      <ChartCard title="Review Activity (Last 90 Days)">
        {heatLoading ? (
          <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <Heatmap days={heatmap} />
        )}
      </ChartCard>

      {/* Upcoming forecast */}
      <ChartCard title="Upcoming Reviews (Next 30 Days)">
        {forecastLoading ? (
          <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={forecast} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(v: string) => v.slice(5)} // MM-DD
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v: number) => [`${v} cards`, 'Due']}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Due" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Retention trend */}
      <ChartCard title="Retention Rate (Last 30 Days)">
        {retentionLoading ? (
          <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={retention} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Retention']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Retention %"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
