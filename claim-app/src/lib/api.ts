import type {
  CreateVoucherPayload,
  PublicVoucher,
  RedeemResponse,
  RedeemVoucherPayload,
  RedemptionsSummary,
  Voucher,
} from "@/types/voucher"

const API_BASE = "/api"

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
     
    }
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMessage = data?.error || `Request failed with status ${response.status}`
      throw new Error(errorMessage)
    }

    return data as T
  }

  async createVoucher(payload: CreateVoucherPayload): Promise<Voucher> {
    return this.request<Voucher>("/vouchers", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async listVouchers(): Promise<Voucher[]> {
    return this.request<Voucher[]>("/vouchers")
  }

  async getVoucher(code: string): Promise<PublicVoucher> {
    return this.request<PublicVoucher>(`/vouchers/${encodeURIComponent(code)}`)
  }

  async redeemVoucher(code: string, payload: RedeemVoucherPayload): Promise<RedeemResponse> {
    return this.request<RedeemResponse>(`/vouchers/${encodeURIComponent(code)}/redeem`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async getRedemptions(code: string): Promise<RedemptionsSummary> {
    return this.request<RedemptionsSummary>(`/vouchers/${encodeURIComponent(code)}/redemptions`)
  }
}

export const api = new ApiClient()
