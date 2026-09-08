import { CreateVoucherForm } from "@/components/ui/create-voucher-form"

export const CreateVoucherPage = () => {
  return (
    <div className="flex-1 h-full pt-6">
      <div className="space-y-1">
        <h2 className="text-3xl">Create a voucher</h2>
        <p className="text-sm text-muted-foreground">
          Issue a custom promotional or gift voucher with redemption limits and budget controls.
        </p>
      </div>

      <CreateVoucherForm />
    </div>
  )
}