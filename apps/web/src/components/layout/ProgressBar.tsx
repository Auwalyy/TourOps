'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * A thin bar across the top whenever the app is working on something the user
 * asked for: following a link, loading a page's data for the first time, or
 * saving. Background refreshes of data already on screen don't count, so it
 * never flickers on its own.
 */
export function ProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const firstLoads = useIsFetching({ predicate: (q) => q.state.data === undefined });
  const saving = useIsMutating();

  // Start on an internal link click — before the new route has rendered.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setNavigating(true);
    }
    // Row clicks and other router.push navigations announce themselves.
    const onNavigate = () => setNavigating(true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('tourops:navigate', onNavigate);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('tourops:navigate', onNavigate);
    };
  }, []);

  // The route changed — navigation is done.
  useEffect(() => {
    setNavigating(false);
  }, [pathname, search]);

  // Never leave the bar running if a navigation is cancelled or goes nowhere.
  useEffect(() => {
    if (!navigating) return;
    const t = setTimeout(() => setNavigating(false), 15000);
    return () => clearTimeout(t);
  }, [navigating]);

  const busy = navigating || firstLoads > 0 || saving > 0;

  // Fast operations shouldn't flash a bar; only show after a short delay.
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (busy) timer.current = setTimeout(() => setVisible(true), 120);
    else setVisible(false);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [busy]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="progress-bar-indeterminate h-full w-1/3 bg-blue-600" />
    </div>
  );
}
