import { HTMLAttributes } from 'react';
import { cn, getInitials } from '@/lib/utils';
export { cn };

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-white/5 dark:bg-slate-800/50', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-slate-900 dark:text-white', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props} />;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const badgeVariants: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export function Badge({ variant = 'default', className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeVariants[variant] || badgeVariants.default, className)}
      {...props}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  return src ? (
    <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />
  ) : (
    <div className={cn('flex items-center justify-center rounded-full bg-blue-600 font-semibold text-white', sizes[size], className)}>
      {getInitials(name)}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)} {...props} />;
}

export function SkeletonCard() {
  return (
    <Card className="p-6">
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  );
}
