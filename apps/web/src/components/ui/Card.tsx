import { HTMLAttributes } from 'react';
import { cn, getInitials } from '@/lib/utils';
export { cn };

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/50', className)}
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
  default: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300',
  // Kept so any direct callers still render, mapped onto the reduced palette.
  purple: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300',
  orange: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
};

export function Badge({ variant = 'default', className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
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
