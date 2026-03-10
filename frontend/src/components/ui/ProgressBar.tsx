

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  colorClass?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  max,
  className = '',
  colorClass = 'bg-indigo-600',
  showLabel = false,
  label,
}: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{label ?? `${value} / ${max}`}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
