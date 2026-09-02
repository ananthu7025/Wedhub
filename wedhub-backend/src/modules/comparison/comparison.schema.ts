import { z } from "zod";

export const compareVendorsQuerySchema = z.object({
  vendorIds: z
    .string()
    .transform((val) => val.split(",").map((id) => id.trim()))
    .pipe(z.array(z.string().uuid()).min(2).max(5)),
});

export type CompareVendorsQuery = z.infer<typeof compareVendorsQuerySchema>;
