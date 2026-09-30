'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Keeps the active tab in the URL (`?tab=`) so tabs can be linked to and the
 * back button behaves. The first tab is the default and stays off the URL.
 *
 * Pages using this must sit inside a <Suspense> boundary — `useSearchParams`
 * opts the tree out of static prerendering otherwise.
 */
export function useTabParam(tabs: TabDef[], param = 'tab') {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const raw = params.get(param);
  const active = tabs.some((t) => t.id === raw) ? (raw as string) : tabs[0].id;

  function setActive(id: string) {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (id === tabs[0].id) next.delete(param);
    else next.set(param, id);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return { active, setActive };
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-neutral-200', className)}>
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-[13px] transition-colors',
              active === id
                ? 'border-blue-600 font-medium text-blue-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
