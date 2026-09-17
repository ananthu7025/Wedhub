import { z } from "zod";

export const startConversationSchema = z.object({
  vendorId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(4000),
});

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type StartConversationBody = z.infer<typeof startConversationSchema>;
export type SendMessageBody = z.infer<typeof sendMessageSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
