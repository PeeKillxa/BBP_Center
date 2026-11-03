import { Navigate, Route, Routes, useLocation } from 'react-router'
import { ShopProvider } from './production/context'
import { Layout } from './production/Layout'
import { Farm, Help, Home, ListingDetail, Maps } from './production/Storefront'
import { Account, Auth, Wallet } from './production/Account'
import { Admin } from './production/Admin'
import { PageHeader } from './components/ui'

function WalletRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/wallet${search}`} replace />
}
export function App() {
  return (
    <ShopProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="maps" element={<Maps />} />
          <Route path="maps/:mapId" element={<Maps />} />
          <Route path="listing/:id" element={<ListingDetail />} />
          <Route path="farm" element={<Farm />} />
          <Route path="farm/:serviceId" element={<Farm />} />
          <Route path="login" element={<Auth />} />
          <Route path="register" element={<Auth />} />
          <Route path="forgot" element={<Navigate to="/help" replace />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="wallet/live" element={<WalletRedirect />} />
          <Route path="account" element={<Account />} />
          <Route path="account/:section" element={<Account />} />
          <Route path="account/:section/:id" element={<Account />} />
          <Route path="owner" element={<Admin />} />
          <Route path="owner/farm" element={<Navigate to="/owner" replace />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<PageHeader title="ไม่พบหน้านี้" />} />
        </Route>
      </Routes>
    </ShopProvider>
  )
}
