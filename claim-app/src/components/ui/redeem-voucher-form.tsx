import { useState, useEffect } from "react"
import { useForm } from "@tanstack/react-form"
import {
  Loader2,
  SearchIcon,
  LockKeyholeIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import type { PublicVoucher, RedeemVoucherPayload } from "@/types/voucher"
import { redeemVoucherSchema, type RedeemVoucherT } from "@/schemas/schema"
import { getErrorMessage } from "@/utils/helpers"
import InputContainer from "./input-container"
import { Input } from "./input"
import { Label } from "./label"
import { Button } from "./button"
import { ErrorContainer } from "./error-container"

interface RedeemVoucherFormProps {
  initialCode?: string
  onSubmit: (data: {
    code: string
    payload: RedeemVoucherPayload
  }) => Promise<void> | void
  isSubmitting?: boolean
}

export const RedeemVoucherForm = ({
  initialCode = "",
  onSubmit,
  isSubmitting = false,
}: RedeemVoucherFormProps) => {
  const [voucherDetails, setVoucherDetails] = useState<PublicVoucher | null>(
    null
  )
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      code: initialCode ? initialCode.toUpperCase() : "",
      redeemer_name: "",
      security_answer: "",
      notes: "",
    } as RedeemVoucherT,
    validators: {
      onChange: redeemVoucherSchema,
      onMount: redeemVoucherSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = redeemVoucherSchema.safeParse(value)
      if (!parsed.success) {
        setVerifyError("Please fill in all required fields.")
        return
      }

      await onSubmit({
        code: parsed.data.code.trim().toUpperCase(),
        payload: {
          redeemer_name: parsed.data.redeemer_name.trim(),
          security_answer: parsed.data.security_answer?.trim() || undefined,
          notes: parsed.data.notes?.trim() || undefined,
        },
      })
    },
  })

  const verifyVoucherCode = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim().toUpperCase()
    if (!trimmed || trimmed.length < 2) return
    setIsVerifying(true)
    setVerifyError(null)


    try {
      const voucher = await api.getVoucher(trimmed)
      setVoucherDetails(voucher)
      if (voucher.is_expired) {
        setVerifyError("This voucher has already expired.")
      } else if (voucher.remaining_redemptions <= 0) {
        setVerifyError("This voucher has reached its maximum redemptions.")
      }
    } catch (err) {
      setVoucherDetails(null)
      setVerifyError(
        err instanceof Error ? err.message : "Voucher code not found or invalid"
      )
    } finally {
      setIsVerifying(false)
    }
  }

  // Auto-verify on initial mount if code exists
  useEffect(() => {
    if (initialCode) {
      verifyVoucherCode(initialCode)
    }
  }, [initialCode])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="mt-6 max-w-lg space-y-6"
    >
      {/* Voucher Code */}
      <form.Field
        name="code"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <div className="space-y-2">
              <InputContainer
                errorMessage={errorMessage}
                label="Voucher code"
                helpText="Enter the unique code provided to you."
              >
                <div className="relative flex items-center">
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g. CLAIM-LUNCH"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) =>
                      field.handleChange(e.target.value.toUpperCase())
                    }
                    aria-invalid={Boolean(errorMessage)}
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    className={"absolute right-1 cursor-pointer"}
                    size={"sm"}
                    disabled={isVerifying || !field.state.value}
                    variant={"outline"}
                    onClick={() => verifyVoucherCode(field.state.value)}
                  >
                    {isVerifying ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <SearchIcon />
                    )}
                    Check
                  </Button>
                </div>
                  {verifyError && <ErrorContainer error={verifyError} />}
              </InputContainer>
            </div>
          )
        }}
      />

    

      {/* Verified Voucher Preview Card */}
      {voucherDetails && !verifyError && (
       <>
       <div className="rounded-xl border">
        <div className="py-2 px-3">
           <h3 className="uppercase mb-1 font-semibold">{voucherDetails.name}</h3>
           <p className="text-xs">₦{voucherDetails.amount} voucher balance</p>
        </div>
        <div className="border-dashed border-t p-3 ">
         <div className="flex justify-between items-center">
           <p className="text-xs font-medium">Valid until</p>
          <p className="text-xs">{new Date(voucherDetails.expiry_date).toLocaleDateString()}</p>
         </div>
          {voucherDetails.has_security_question && (
            <div className="p-1 border-dashed border w-max mt-2 flex gap-1">
              <LockKeyholeIcon size={12} className="mt-0.4"/>
            <p className="text-xs"> Security question required</p>
            </div>
          )}
        </div>
        
       </div>
       
       </>
      )}

 
      <form.Field
        name="redeemer_name"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <InputContainer
              errorMessage={errorMessage}
              label="Your name"
              helpText="Enter your name to claim this voucher."
            >
              <Input
                id={field.name}
                name={field.name}
                placeholder="e.g. Alex Johnson"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={Boolean(errorMessage)}
              />
            </InputContainer>
          )
        }}
      />

      {/* Security Question (if required) */}
      {voucherDetails?.has_security_question && (
        <div className="space-y-4 py-2 px-3 rounded-xl border">
          <div className="space-y-1">
             <div className="p-1 border-dashed border w-max mt-2 flex gap-1">
              <LockKeyholeIcon size={12} className="mt-0.5"/>
            <p className="text-xs"> Security question</p>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {voucherDetails.security_question ||
                "Please provide the security answer"}
            </p>
          </div>

          <form.Field
            name="security_answer"
            children={(field) => {
              const errorMessage = getErrorMessage(field)
              return (
                <InputContainer
                  errorMessage={errorMessage}
                  label="Your answer"
                  helpText="Answers are case-insensitive."
                >
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Enter security answer..."
                    value={field.state.value ?? ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={Boolean(errorMessage)}
                  />
                </InputContainer>
              )
            }}
          />
        </div>
      )}

      <form.Field
        name="notes"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <InputContainer
              errorMessage={errorMessage}
              label={
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.name}>Note (optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    Optional
                  </span>
                </div>
              }
              helpText="Add any note or reference for this redemption."
            >
              <Input
                id={field.name}
                name={field.name}
                placeholder="e.g. Thanks for the reward!"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={Boolean(errorMessage)}
              />
            </InputContainer>
          )
        }}
      />

      <div className="pt-2">
        <form.Subscribe
          children={({ isValid }) => (
            <Button
              type="submit"
              disabled={
                !isValid ||
                isSubmitting ||
                (voucherDetails?.is_expired ?? false)
              }
              className="w-full cursor-pointer"
            >
              {isSubmitting ? (
                <span>Redeeming...</span>
              ) : (
                <>
                  <span>Redeem Voucher</span>
                </>
              )}
            </Button>
          )}
        />
      </div>
    </form>
  )
}
