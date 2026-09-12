import { PencilSparklesIcon } from "lucide-react"
import InputContainer from "./input-container"
import { Input } from "./input"
import { getErrorMessage, suggestCodeBasedOnName } from "@/utils/helpers"
import { useForm, useSelector } from "@tanstack/react-form"
import { voucherDetailsSchema } from "@/schemas/schema"
import { Label } from "./label"
import { TextMorph } from "torph/react"
import { useState } from "react"    
import { Button } from "./button"

interface VoucherNameFormProps {
  initialValues?: {
    name: string
    code: string
  }
  onSuccess: (values: { name: string; code: string }) => void
}

export const VoucherNameForm = ({
  initialValues,
  onSuccess,
}: VoucherNameFormProps) => {
  const [suggestedCodes, setSuggestedCodes] = useState<string[]>([])

  const form = useForm({
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
    },
    validators: {
      onChange: voucherDetailsSchema,
      onMount: voucherDetailsSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = voucherDetailsSchema.safeParse(value)
      if (!parsed.success) {
        return
      }
      onSuccess({
        name: parsed.data.name.trim(),
        code: parsed.data.code.trim().toUpperCase(),
      })
    },
  })
  const nameValue = useSelector(form.store, (state) => state.values.name)
  const canSuggest = Boolean(nameValue && nameValue.trim().length >= 2)

  const handleSuggestions = () => {
    if (!canSuggest) return
    const suggestions = suggestCodeBasedOnName(nameValue.trim(), 6)
    setSuggestedCodes(suggestions)
  }
  return (
    <form onSubmit={(e)=>{
        e.preventDefault()
        form.handleSubmit()
    }} className="space-y-6 mt-6 max-w-lg">
      <form.Field
        name="name"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <InputContainer
              errorMessage={errorMessage}
              label="Voucher name"
              helpText="Only visible to you. Helps identify this voucher later"
            >
              <Input
                id={field.name}
                name={field.name}
                placeholder="e.g. TEAM LUNCH"
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
        name="code"
        children={(field) => {
          const errorMessage = getErrorMessage(field)
          return (
            <div className="space-y-2">
              <InputContainer
                errorMessage={errorMessage}
                label={
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.name}>Voucher code</Label>
                    <button
                      type="button"
                      onClick={handleSuggestions}
                      disabled={!canSuggest}
                      className="m-0 flex cursor-pointer items-center gap-1 p-0 text-xs text-green-600 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <PencilSparklesIcon size={12} /> Suggest
                    </button>
                  </div>
                }
                helpText="Unique code users will enter to claim."
              >
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
                />
              </InputContainer>

              {suggestedCodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {suggestedCodes.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => field.handleChange(sug)}
                      className="inline-flex cursor-pointer items-center rounded-xl bg-[#F3F9F7] px-2.5 py-1 text-xs text-[#008F63] transition-colors hover:bg-[#E4F3ED]"
                    >
                      <TextMorph>{sug}</TextMorph>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }}
      />

      <form.Subscribe
        children={({ isValid }) => (
          <Button
            type="submit"
            disabled={!isValid}
            className="w-full cursor-pointer py-5"
          >
            <span>Continue</span>
          </Button>
        )}
      />
    </form>
  )
}
