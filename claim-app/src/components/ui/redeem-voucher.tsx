import { useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "@/lib/api"
import type { RedeemResponse, RedeemVoucherPayload } from "@/types/voucher"
import { RedeemVoucherForm } from "./redeem-voucher-form"
import { ErrorContainer } from "./error-container"

export const RedeemVoucher = () => {
  const { code: routeCode } = useParams<{ code?: string }>()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [redemptionResult, setRedemptionResult] =
    useState<RedeemResponse | null>(null)
  const [redeemedDetails, setRedeemedDetails] = useState<{
    code: string
    redeemer_name: string
  } | null>(null)

  const handleRedeem = async (data: {
    code: string
    payload: RedeemVoucherPayload
  }) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const result = await api.redeemVoucher(data.code, data.payload)
      setRedemptionResult(result)
      setRedeemedDetails({
        code: data.code,
        redeemer_name: data.payload.redeemer_name,
      })
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Failed to redeem voucher"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="h-full flex-1 pt-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight">
          Redeem a voucher
        </h2>
        <p className="text-sm text-muted-foreground">
          {redemptionResult
            ? "Your voucher has been claimed and processed."
            : "Enter a voucher code and your details to claim the reward."}
        </p>
      </div>

      <div className="mt-6 max-w-lg space-y-6">
        {!redemptionResult ? (
         <>
          <RedeemVoucherForm
            initialCode={routeCode}
            onSubmit={handleRedeem}
            isSubmitting={isSubmitting}
          />
           {serverError && <ErrorContainer error={serverError} />}</>
        ) : (
          /* Success Screen */
          <div className="space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            success
          </div>
        )}
      </div>
    </div>
  )
}
