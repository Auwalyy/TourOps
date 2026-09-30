'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { subscriptionApi } from '@/services/api.service';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';

/** Where Flutterwave returns the customer after checkout. */
function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const reference = params.get('tx_ref') || params.get('reference');

  const [state, setState] = useState<'checking' | 'success' | 'failed'>('checking');
  const [message, setMessage] = useState('');
  const [paidUntil, setPaidUntil] = useState<string | undefined>();

  useEffect(() => {
    if (!reference) {
      setState('failed');
      setMessage('No payment reference was returned.');
      return;
    }

    subscriptionApi
      .verify(reference)
      .then((r) => {
        const sub = r.data.data?.subscription;
        if (r.data.data?.status === 'success') {
          setState('success');
          setPaidUntil(sub?.currentPeriodEnd);
          // Clears the lock screen and the banner without a reload.
          qc.invalidateQueries({ queryKey: ['subscription'] });
        } else {
          setState('failed');
          setMessage('That payment did not go through. You have not been charged.');
        }
      })
      .catch((e) => {
        setState('failed');
        setMessage(e.response?.data?.message || 'We could not confirm that payment.');
      });
  }, [reference, qc]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {state === 'checking' && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-4 text-sm font-medium text-neutral-900">Confirming your payment…</p>
            <p className="mt-1 text-xs text-neutral-500">This takes a few seconds. Please don&apos;t close the page.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p className="mt-4 text-base font-semibold text-neutral-900">Payment received</p>
            <p className="mt-1 text-[13px] text-neutral-600">
              Your account is active{paidUntil ? ` until ${formatDate(paidUntil)}` : ''}.
            </p>
            <Button className="mt-6" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-600" />
            <p className="mt-4 text-base font-semibold text-neutral-900">Payment not completed</p>
            <p className="mt-1 text-[13px] text-neutral-600">{message}</p>
            <Button className="mt-6" variant="outline" onClick={() => router.push('/billing')}>
              Try again
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
