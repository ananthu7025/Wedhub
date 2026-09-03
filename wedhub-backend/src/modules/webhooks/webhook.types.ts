declare module "express-serve-static-core" {
  interface Request {
    rawBody?: Buffer;
  }
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; status: string; error_description?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
    // Fires for Razorpay Payment Links (Arch Phase 26's Telegram ₹49
    // publish flow) — a distinct event from payment.captured because a
    // Payment Link generates its own internal order that was never
    // created/stored by us ahead of time, so correlation back to our
    // Payment row goes via the link's own id (echoed in `notes` at
    // creation — see razorpay.client.ts's createPaymentLink), not via a
    // pre-known order_id.
    payment_link?: { entity: { id: string; notes?: Record<string, string> } };
  };
  created_at: number;
}
