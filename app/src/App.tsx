import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Layout } from './components/Layout'
import { AccountHome } from './pages/account/AccountHome'
import { FarmJobDetail, FarmJobs } from './pages/account/FarmJobs'
import { Notifications } from './pages/account/Notifications'
import { OrderDetail, Orders } from './pages/account/Orders'
import { Profile } from './pages/account/Profile'
import { ReservationDetail, Reservations } from './pages/account/Reservations'
import { Transactions } from './pages/account/Transactions'
import { Forgot, Login, Register } from './pages/auth/Auth'
import { FarmIndex } from './pages/FarmIndex'
import { FarmService } from './pages/FarmService'
import { Help } from './pages/Help'
import { Home } from './pages/Home'
import { ListingDetail } from './pages/ListingDetail'
import { MapListings } from './pages/MapListings'
import { Maps } from './pages/Maps'
import { NotFound } from './pages/NotFound'
import { OwnerFarm } from './pages/OwnerFarm'
import { WalletPage } from './pages/Wallet'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="maps" element={<Maps />} />
          <Route path="maps/:mapId" element={<MapListings />} />
          <Route path="listing/:id" element={<ListingDetail />} />
          <Route path="farm" element={<FarmIndex />} />
          <Route path="farm/:serviceId" element={<FarmService />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot" element={<Forgot />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="account" element={<AccountHome />} />
          <Route path="account/orders" element={<Orders />} />
          <Route path="account/orders/:id" element={<OrderDetail />} />
          <Route path="account/reservations" element={<Reservations />} />
          <Route path="account/reservations/:id" element={<ReservationDetail />} />
          <Route path="account/farm" element={<FarmJobs />} />
          <Route path="account/farm/:id" element={<FarmJobDetail />} />
          <Route path="account/transactions" element={<Transactions />} />
          <Route path="account/notifications" element={<Notifications />} />
          <Route path="account/profile" element={<Profile />} />
          <Route path="help" element={<Help />} />
          <Route path="owner/farm" element={<OwnerFarm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
