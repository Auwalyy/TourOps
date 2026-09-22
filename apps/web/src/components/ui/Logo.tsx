import { cn } from '@/lib/utils';

/**
 * The TourOps mark — a route sweeping up to its destination, grounded on a
 * record line. Route + record is what the product is: journeys and the
 * paperwork behind them.
 *
 * It is the *product* logo. Inside the dashboard an agency's own branding
 * takes over; this shows on the marketing site and wherever no agency logo
 * has been uploaded.
 */
export function LogoMark({
  size = 32,
  className,
  /** 'tile' = white mark on a brand tile. 'bare' = mark alone in currentColor. */
  variant = 'tile',
}: {
  size?: number;
  className?: string;
  variant?: 'tile' | 'bare';
}) {
  const stroke = variant === 'tile' ? '#ffffff' : 'currentColor';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {variant === 'tile' && <rect width="40" height="40" rx="11" fill="currentColor" />}

      {/* The route */}
      <path
        d="M9.5 28.5C12.5 19.5 18.5 14.8 25.2 13.6"
        stroke={stroke}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* The destination */}
      <circle cx="29.6" cy="13.1" r="3.3" fill={stroke} />
      {/* The record it leaves behind */}
      <rect x="9" y="31.4" width="21" height="3.2" rx="1.6" fill={stroke} opacity="0.5" />
    </svg>
  );
}

/** Mark plus wordmark, for headers and the marketing site. */
export function Logo({
  size = 32,
  className,
  variant = 'tile',
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  variant?: 'tile' | 'bare';
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark size={size} variant={variant} />
      <span
        className={cn(
          'text-lg font-semibold tracking-tight text-neutral-900',
          wordmarkClassName
        )}
      >
        Tour<span className="font-bold">Ops</span>
      </span>
    </span>
  );
}
