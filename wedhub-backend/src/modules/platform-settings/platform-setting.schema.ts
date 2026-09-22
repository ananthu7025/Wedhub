import { z } from "zod";

export const updateSettingSchema = z.object({
  value: z.coerce.number().min(0),
});

export type UpdateSettingBody = z.infer<typeof updateSettingSchema>;
