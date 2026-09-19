import { HTMLAttributes } from 'react';
import { cn, getInitials } from '@/lib/utils';
export { cn };

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800',
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-neutral-900 dark:text-neutral-100', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
/** Five meanings, not a palette. Muted fills so a table of them stays readable. */
const badgeVariants: Record<string, string> = {
  default: 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  purple: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  orange: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
};

export function Badge({ variant = 'default', className, ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium',
        badgeVariants[variant] || badgeVariants.default,
        className
      )}
      {...props}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };
  return src ? (
    <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />
  ) : (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-neutral-100 font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded bg-neutral-100 dark:bg-neutral-800', className)} {...props} />;
}

export function SkeletonCard() {
  return (
    <Card className="p-5">
      <Skeleton className="mb-3 h-3.5 w-1/3" />
      <Skeleton className="mb-2 h-7 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  );
}
