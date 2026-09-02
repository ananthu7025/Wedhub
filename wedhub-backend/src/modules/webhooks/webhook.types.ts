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
  };
  created_at: number;
}
