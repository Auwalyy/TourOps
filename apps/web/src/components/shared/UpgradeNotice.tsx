'use client';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Shown in place of a feature the current plan does not include. It explains
 * what the feature does rather than just saying no — this is the moment an
 * agency decides whether the next plan is worth paying for.
 */
export function UpgradeNotice({ feature, body }: { feature: string; body: string }) {
  return (
    <Card className="py-14 text-center">
      <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100">
        <Lock className="h-4 w-4 text-neutral-400" />
      </span>
      <p className="text-sm font-medium text-neutral-900">{feature} is part of a higher plan</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-neutral-500">{body}</p>
      <Link href="/billing">
        <Button className="mt-5">See plans</Button>
      </Link>
    </Card>
  );
}
