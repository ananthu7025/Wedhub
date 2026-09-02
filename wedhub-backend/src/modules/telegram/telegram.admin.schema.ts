import { z } from "zod";

export const registerWebhookSchema = z.object({
  url: z.string().url(),
});

export type RegisterWebhookBody = z.infer<typeof registerWebhookSchema>;
