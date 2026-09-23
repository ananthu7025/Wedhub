import { z } from "zod";

export const startConversationSchema = z.object({
  vendorId: z.string().uuid(),
  leadId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
});

export const sendMessageSchema = z.object({
  // Item 6: an attachment message may carry an empty/short caption instead
  // of real body text — still requires at least mediaId or non-empty body,
  // enforced in superRefine below rather than making body fully optional
  // (a message with neither would be meaningless).
  body: z.string().trim().max(4000).default(""),
  mediaId: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  if (!value.body && !value.mediaId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Message cannot be empty" });
  }
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
