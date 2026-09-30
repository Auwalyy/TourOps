import { Response, NextFunction, Request } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { flutterwaveService } from '../services/flutterwave.service';
import { PLANS, PlanId, BillingCycle } from '../config/plans';
import { AuthRequest } from '../types/express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const subscriptionController = {
  /** What the billing page and the access gate both read. */
  async status(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getStatus(req.user!.agencyId!.toString());
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  async plans(_req: Request, res: Response) {
    res.json({ success: true, data: { plans: PLANS, gatewayConfigured: flutterwaveService.isConfigured() } });
  },

  async checkout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { plan, billingCycle } = req.body as { plan: PlanId; billingCycle?: BillingCycle };
      if (!plan || !PLANS[plan]) throw new AppError('Choose a valid plan', 400);

      const data = await subscriptionService.createCheckout(
        req.user!.agencyId!.toString(),
        req.user!._id.toString(),
        plan,
        billingCycle === 'yearly' ? 'yearly' : 'monthly'
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  /** Called by the browser when Flutterwave sends the customer back. */
  async verify(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionService.confirmPayment(req.params.reference);
      const data = await subscriptionService.getStatus(req.user!.agencyId!.toString());
      res.json({ success: true, data: { ...result, subscription: data } });
    } catch (e) {
      next(e);
    }
  },

  async history(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.history(req.user!.agencyId!.toString());
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  /**
   * Flutterwave's server-to-server notification. Unauthenticated by design,
   * so the `verif-hash` secret is the only thing that makes it trustworthy.
   */
  async webhook(req: Request, res: Response) {
    const signature = req.headers['verif-hash'] as string | undefined;

    if (!flutterwaveService.verifyWebhookSignature(signature)) {
      logger.warn('Rejected Flutterwave webhook with a bad verif-hash');
      res.status(401).json({ success: false });
      return;
    }

    // Acknowledge immediately — Flutterwave retries on anything slow or
    // non-200, and the work below is idempotent anyway.
    res.sendStatus(200);

    const event = req.body?.event;
    const reference = req.body?.data?.tx_ref;
    if (event !== 'charge.completed' || !reference) return;

    try {
      // Never trust the payload's status — re-verify against the API.
      await subscriptionService.confirmPayment(reference);
    } catch (e) {
      logger.error(`Flutterwave webhook could not apply ${reference}:`, e as Error);
    }
  },
};
