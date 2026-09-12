export interface Voucher {
  id: string
  name: string
  code: string
  amount: number
  max_redemptions: number
  current_redemptions: number
  expiry_date: string
  has_security_question: boolean
  created_at: string
}

export interface PublicVoucher {
  code: string
  name: string
  amount: number
  expiry_date: string
  remaining_redemptions: number
  is_expired: boolean
  has_security_question: boolean
  security_question?: string
}

export interface CreateVoucherPayload {
  name: string
  code: string
  amount: number
  max_redemptions: number
  expiry_date: string
  security_question?: string
  security_answer?: string
}

export interface RedeemVoucherPayload {
  redeemer_name: string
  security_answer?: string
  notes?: string
}

export interface RedeemResponse {
  status: string
  message: string
  amount: number
  redemption_id: string
  redeemed_at: string
}

export interface RedemptionItem {
  id: string
  redeemer_name: string
  redeemed_at: string
  notes?: string
}

export interface RedemptionsSummary {
  voucher: Voucher
  redemptions: RedemptionItem[]
}
