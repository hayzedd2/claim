import { useForm, useSelector } from "@tanstack/react-form"
import {
  voucherCustomizationSchema,
  type voucherCustomizationT,
} from "@/schemas/schema"
import { getErrorMessage, defaultExpiry, tomorrowStr } from "@/utils/helpers"
import InputContainer from "./input-container"
import { Input } from "./input"
import { Label } from "./label"
import { Button } from "./button"
import { Checkbox } from "./checkbox"

interface VoucherConditionsFormProps {
  initialValues?: Partial<voucherCustomizationT>
  voucherSummary: {
    name: string
    code: string
  }
  onBack: () => void
  onSubmit: (data: voucherCustomizationT) => Promise<void> | void
  isSubmitting?: boolean
}

export const VoucherConditionsForm = ({
  initialValues,
  voucherSummary,
  onBack,
  onSubmit,
  isSubmitting = false,
}: VoucherConditionsFormProps) => {
  const form = useForm({
    defaultValues: {
      amount: initialValues?.amount ?? 0,
      max_redemptions: initialValues?.max_redemptions ?? 0,
      expiry_date: initialValues?.expiry_date || defaultExpiry(14),
      require_security: initialValues?.require_security ?? false,
      security_question: initialValues?.security_question ?? "",
      security_answer: initialValues?.security_answer ?? "",
    },
    validators: {
      onChange: voucherCustomizationSchema,
      onMount: voucherCustomizationSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = voucherCustomizationSchema.safeParse(value)
      if (!parsed.success) {
        return
      }
      await onSubmit(parsed.data)
    },
  })

  const requireSecurity = useSelector(
    form.store,
    (state) => state.values.require_security
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="mt-6 max-w-lg space-y-6"
    >
      {/* Voucher Summary Badge */}
      {voucherSummary && (
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3.5 py-2.5 text-xs">
          <div>
            <span className="text-muted-foreground">Voucher: </span>
            <span className="font-semibold text-foreground">
              {voucherSummary.name || "Untitled"}
            </span>{" "}
            <span className="ml-1.5 font-mono font-medium text-primary">
              ({voucherSummary.code || "NO-CODE"})
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
      )}
      <form.Field
        name="amount"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <div className="space-y-2">
              <InputContainer
                errorMessage={errorMessage}
                label="Voucher amount"
                helpText="Value allocated per voucher claim (₦1,000 – ₦30,000)."
              >
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1000}
                  max={30000}
                  step={500}
                  placeholder="5000"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  aria-invalid={Boolean(errorMessage)}
                />
              </InputContainer>
            </div>
          )
        }}
      />

      <form.Field
        name="max_redemptions"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <div className="space-y-2">
              <InputContainer
                errorMessage={errorMessage}
                label="Redemptions"
                helpText="How many users can redeem the code."
              >
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="10"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  aria-invalid={Boolean(errorMessage)}
                />
              </InputContainer>
            </div>
          )
        }}
      />

      <form.Field
        name="expiry_date"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <InputContainer
              errorMessage={errorMessage}
              label="Expires on"
              helpText="Voucher will automatically expire at 23:59 on this date."
            >
              <Input
                id={field.name}
                name={field.name}
                type="date"
                min={tomorrowStr()}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={Boolean(errorMessage)}
              />
            </InputContainer>
          )
        }}
      />

      <form.Field
        name="require_security"
        children={(field) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id={field.name}
              name={field.name}
              checked={field.state.value}
              onCheckedChange={field.handleChange}
              className="mt-1"
            />

            <div>
              <Label htmlFor={field.name} className="cursor-pointer">
                Add a security question
              </Label>
              <p className="text-xs text-muted-foreground">
                Require users to answer a secret question before claiming.
              </p>
            </div>
          </div>
        )}
      />

      {requireSecurity && (
        <div className="space-y-4 border-t border-border/40 pt-2">
          <form.Field
            name="security_question"
            children={(field) => {
              const errorMessage = getErrorMessage(field)
              return (
                <InputContainer
                  errorMessage={errorMessage}
                  label="Security question"
                >
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g. What is our secret team mascot?"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={Boolean(errorMessage)}
                  />
                </InputContainer>
              )
            }}
          />

          <form.Field
            name="security_answer"
            children={(field) => {
              const errorMessage = getErrorMessage(field)
              return (
                <InputContainer
                  errorMessage={errorMessage}
                  label="Security answer"
                >
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="e.g. Falcon"
                    value={field.state.value}
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

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          <span>Back</span>
        </Button>

        <form.Subscribe
          children={({ isValid }) => (
            <Button
              type="submit"
              className="cursor-pointer"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <span>Create Voucher</span>
                </>
              )}
            </Button>
          )}
        />
      </div>
    </form>
  )
}
