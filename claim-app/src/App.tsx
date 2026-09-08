import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import { HomePage } from "./pages/home-page"
import { CreateVoucherPage } from "./pages/create-voucher-page"
// import { RedeemVoucherPage } from "@/pages/RedeemVoucherPage"
// import { AnalyticsPage } from "@/pages/AnalyticsPage"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateVoucherPage />} />
          {/* <Route path="/redeem" element={<RedeemVoucherPage />} /> */}
          {/* <Route path="/redeem/:code" element={<RedeemVoucherPage />} /> */}
          {/* <Route path="/vouchers/:code/analytics" element={<AnalyticsPage />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
