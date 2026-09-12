import { useState } from "react"
import { api } from "@/lib/api"
import type { Voucher } from "@/types/voucher"
import type { voucherCustomizationT, voucherDetailsT } from "@/schemas/schema"
import { defaultExpiry } from "@/utils/helpers"
import { VoucherNameForm } from "./voucher-name-form"
import { VoucherConditionsForm } from "./voucher-conditions-form"
import { CreateVoucherSuccessful } from "./create-voucher-succesful"
import { ErrorContainer } from "./error-container"

export const CreateVoucher = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdVoucher, setCreatedVoucher] = useState<Voucher | null>(null)

  const [voucherData, setVoucherData] = useState({
    name: "",
    code: "",
    amount: 5000,
    max_redemptions: 10,
    expiry_date: defaultExpiry(14),
    require_security: false,
    security_question: "",
    security_answer: "",
  })

  const handleStep1Submit = (voucherDetails: voucherDetailsT) => {
    setVoucherData((prev) => ({
      ...prev,
      name: voucherDetails.name,
      code: voucherDetails.code,
    }))
    setCurrentStep(2)
  }

  const handleStep2Submit = async (
    voucherCustomization: voucherCustomizationT
  ) => {
    const updatedData = {
      ...voucherData,
      ...voucherCustomization,
    }

    try {
      const expTime = new Date(
        `${updatedData.expiry_date}T23:59:59Z`
      ).toISOString()

      const voucher = await api.createVoucher({
        name: updatedData.name.trim(),
        code: updatedData.code.trim().toUpperCase(),
        amount: Number(updatedData.amount),
        max_redemptions: Number(updatedData.max_redemptions),
        expiry_date: expTime,
        security_question: updatedData.require_security
          ? updatedData.security_question?.trim()
          : undefined,
        security_answer: updatedData.require_security
          ? updatedData.security_answer?.trim() || undefined
          : undefined,
      })

      setCreatedVoucher(voucher)
      setCurrentStep(3)
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Failed to create voucher"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setVoucherData({
      name: "",
      code: "",
      amount: 5000,
      max_redemptions: 10,
      expiry_date: defaultExpiry(14),
      require_security: false,
      security_question: "",
      security_answer: "",
    })
    setCreatedVoucher(null)
    setServerError(null)
    setCurrentStep(1)
  }

  return (
    <div className="h-full flex-1 pt-6">
      <div className="space-y-1">
        <h2 className="text-3xl font-semibold tracking-tight">
          Create a voucher
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentStep === 1 &&
            "Issue a custom promotional voucher with personalized code."}
          {currentStep === 2 &&
            "Define value limits, redemption caps, expiration, and security challenge."}
          {currentStep === 3 &&
            "Your voucher is active and ready to be distributed."}
        </p>
      </div>

      <div className="mt-6 max-w-lg space-y-6">
        {serverError && (
         <ErrorContainer error={serverError}/>
        )}

        {currentStep === 1 && (
          <VoucherNameForm
            initialValues={{
              name: voucherData.name,
              code: voucherData.code,
            }}
            onSuccess={handleStep1Submit}
          />
        )}

        {currentStep === 2 && (
          <VoucherConditionsForm
            initialValues={voucherData}
            voucherSummary={{
              name: voucherData.name,
              code: voucherData.code,
            }}
            onBack={() => setCurrentStep(1)}
            onSubmit={handleStep2Submit}
            isSubmitting={isSubmitting}
          />
        )}

        {currentStep === 3 && createdVoucher && (
          <CreateVoucherSuccessful
            voucher={createdVoucher}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}
