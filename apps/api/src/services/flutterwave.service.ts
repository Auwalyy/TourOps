import crypto from 'crypto';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const BASE = 'https://api.flutterwave.com/v3';

export interface InitPaymentResult {
  paymentLink: string;
  reference: string;
}

export interface VerifyPaymentResult {
  status: 'successful' | 'failed' | 'pending';
  /** Naira actually settled. */
  amount: number;
  currency: string;
  reference: string;
  channel?: string;
  paidAt?: Date;
  gatewayResponse?: string;
  raw: unknown;
}

function requireKey(): string {
  if (!config.flutterwave.secretKey) {
    throw new AppError(
      'Online payment is not configured yet. Set FLW_SECRET_KEY on the server.',
      503
    );
  }
  return config.flutterwave.secretKey;
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || body?.status === 'error') {
    logger.error(`Flutterwave ${path} failed: ${res.status} ${JSON.stringify(body)}`);
    throw new AppError(body?.message || 'Payment provider rejected the request', 502);
  }
  return body.data;
}

export const flutterwaveService = {
  isConfigured(): boolean {
    return !!config.flutterwave.secretKey;
  },

  /**
   * Opens a hosted checkout. Flutterwave takes the amount in naira directly —
   * unlike Paystack there is no kobo conversion, so do not scale it.
   */
  async initializePayment(params: {
    email: string;
    name?: string;
    phone?: string;
    amountNaira: number;
    reference: string;
    meta?: Record<string, unknown>;
    redirectUrl?: string;
  }): Promise<InitPaymentResult> {
    const data = await call('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amountNaira,
        currency: 'NGN',
        redirect_url: params.redirectUrl || config.flutterwave.redirectUrl,
        customer: {
          email: params.email,
          name: params.name,
          phonenumber: params.phone,
        },
        customizations: {
          title: 'TourOps Subscription',
          description: 'Travel, visa and Hajj operations software',
        },
        meta: params.meta || {},
      }),
    });

    return { paymentLink: data.link, reference: params.reference };
  },

  /** The only thing we trust to say a payment really happened. */
  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const data = await call(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`
    );

    return {
      status: data.status === 'successful' ? 'successful' : data.status === 'pending' ? 'pending' : 'failed',
      // charged_amount is what the customer actually paid.
      amount: Number(data.charged_amount ?? data.amount ?? 0),
      currency: data.currency,
      reference: data.tx_ref,
      channel: data.payment_type,
      paidAt: data.created_at ? new Date(data.created_at) : undefined,
      gatewayResponse: data.processor_response || data.narration,
      raw: data,
    };
  },

  /**
   * Flutterwave signs webhooks with a static secret hash sent in the
   * `verif-hash` header — set the same value in the dashboard and in
   * FLW_SECRET_HASH. It is a shared secret, not an HMAC of the body, so the
   * comparison is still done in constant time.
   */
  verifyWebhookSignature(signature?: string): boolean {
    const expected = config.flutterwave.secretHash;
    if (!expected || !signature) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  },
};
