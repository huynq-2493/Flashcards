
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'new' | 'learning' | 'review' | 'relearning' | 'default';
}

const variants: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  learning: 'bg-yellow-100 text-yellow-700',
  review: 'bg-green-100 text-green-700',
  relearning: 'bg-red-100 text-red-700',
  default: 'bg-gray-100 text-gray-700',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
