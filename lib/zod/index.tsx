import { z } from "zod";

const phoneSchema = z.string().refine((v) => {
  const val = v.split(" ");

  // return false for country code
  if (val.length < 2) return false;
  // check length
  const len = val
    .slice(1)
    .reduce((a, b) => a + b)
    .replace(/[\s()-]/g, "").length;
  return len >= 6 && len <= 12;
}, "error");

const dropDownSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const documentSchema = z.object({
  documentGuid: z.string(),
  typeId: z.number(),
  type: z.string(),
  sortOrder: z.number(),
  documentName: z.string(),
});

const nameSchema = z
  .string()
  .max(100)
  .min(2)
  .regex(/^[a-zA-Z\s]*$/, {
    message: "Full name cannot contain numbers or special characters",
  });

const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .transform((email) => email.trim());

// optional schemas below

const nameSchemaOpt = z
  .string()
  .optional()
  .refine((val) =>
    val
      ? val.trim().length >= 2 &&
        val.trim().length <= 200 &&
        RegExp(/^[a-zA-Z\s]*$/).test(val)
      : true
  );

const emailSchemaOpt = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().trim().email().optional()
) as z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined>;

const dropDownSchemaOpt = z
  .object({
    value: z.string(),
    label: z.string(),
  })
  .optional();

export {
  phoneSchema,
  dropDownSchema,
  nameSchema,
  emailSchema,
  documentSchema,
  nameSchemaOpt,
  dropDownSchemaOpt,
  emailSchemaOpt,
};
