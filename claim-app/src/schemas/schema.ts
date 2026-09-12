import { z } from "zod"

export const voucherDetailsSchema = z.object({
  name: z.string().min(1, "Voucher name is required").max(100, "Name is too long"),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(30, "Code cannot exceed 30 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores allowed"),
})

export const voucherCustomizationSchema = z
  .object({
    amount: z
      .number({ message: "Amount is required" })
      .min(1000, "Minimum amount is ₦1,000")
      .max(30000, "Maximum amount is ₦30,000"),
    max_redemptions: z
      .number({ message: "Max redemptions is required" })
      .min(1, "At least 1 redemption is required")
      .max(1000, "Maximum 1,000 redemptions"),
    expiry_date: z.string().min(1, "Expiry date is required"),
    require_security: z.boolean(),
    security_question: z.string().default(""),
    security_answer: z.string().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.expiry_date) {
      const selected = new Date(`${data.expiry_date}T23:59:59Z`)
      if (selected <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date must be in the future",
          path: ["expiry_date"],
        })
      }
    }
    if (data.require_security) {
      if (!data.security_question || !data.security_question.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Security question is required when challenge is enabled",
          path: ["security_question"],
        })
      }
      if (!data.security_answer || !data.security_answer.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Security answer is required when challenge is enabled",
          path: ["security_answer"],
        })
      }
    }
  })

export const voucherSchema = voucherDetailsSchema.extend(voucherCustomizationSchema.shape)

export const redeemLookupSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(30, "Code cannot exceed 30 characters")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores allowed"),
})

export const redeemVoucherSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(30, "Code cannot exceed 30 characters"),
  redeemer_name: z
    .string()
    .min(1, "Your name is required")
    .max(100, "Name is too long"),
  security_answer: z.string().optional(),
  notes: z.string().max(250, "Notes cannot exceed 250 characters").optional(),
})

export type voucherSchema = z.infer<typeof voucherSchema>
export type voucherDetailsT = z.infer<typeof voucherDetailsSchema>
export type voucherCustomizationT = z.infer<typeof voucherCustomizationSchema>
export type RedeemLookupT = z.infer<typeof redeemLookupSchema>
export type RedeemVoucherT = z.infer<typeof redeemVoucherSchema>
