'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * After a new deploy, a tab still running the old build asks for code files
 * that no longer exist. Reloading once picks up the new build; the session
 * flag stops it looping if the problem is something else.
 */
function isStaleBuild(error: Error) {
  return /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch/i.test(`${error.name} ${error.message}`);
}

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    if (!isStaleBuild(error)) return;
    try {
      if (sessionStorage.getItem('reloaded-for-new-build')) return;
      sessionStorage.setItem('reloaded-for-new-build', '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <Card className="mx-auto mt-10 max-w-md px-6 py-10 text-center">
      <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
      </span>
      <p className="text-sm font-medium text-neutral-900">Something went wrong on this page</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-neutral-500">
        Your data is safe. Try again — if it keeps happening, go back and reopen the page, or tell support
        {error.digest ? <> and quote <span className="font-mono">{error.digest}</span></> : null}.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline">Go to dashboard</Button>
        </Link>
      </div>
    </Card>
  );
}
