import { z } from "zod"


export const voucherSchema = z
  .object({
    name: z.string().min(1, "Voucher name is required").max(100, "Name is too long"),
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(30, "Code cannot exceed 30 characters")
      .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, hyphens, and underscores allowed"),
    amount: z
      .number()
      .min(1000, "Minimum amount is ₦1,000")
      .max(30000, "Maximum amount is ₦30,000"),
    max_redemptions: z
      .number()
      .min(1, "At least 1 redemption is required")
      .max(1000, "Maximum 1,000 redemptions"),
    expiry_date: z.string().min(1, "Expiry date is required"),
    require_security: z.boolean(),
    security_question: z.string(),
    security_answer: z.string(),
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