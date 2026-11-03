import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Layout } from './components/Layout'
const AccountHome = lazy(() => import('./pages/account/AccountHome').then(m => ({ default: m.AccountHome })))
const FarmJobs = lazy(() => import('./pages/account/FarmJobs').then(m => ({ default: m.FarmJobs })))
const FarmJobDetail = lazy(() => import('./pages/account/FarmJobs').then(m => ({ default: m.FarmJobDetail })))
const Notifications = lazy(() => import('./pages/account/Notifications').then(m => ({ default: m.Notifications })))
const Orders = lazy(() => import('./pages/account/Orders').then(m => ({ default: m.Orders })))
const OrderDetail = lazy(() => import('./pages/account/Orders').then(m => ({ default: m.OrderDetail })))
const Profile = lazy(() => import('./pages/account/Profile').then(m => ({ default: m.Profile })))
const Reservations = lazy(() => import('./pages/account/Reservations').then(m => ({ default: m.Reservations })))
const ReservationDetail = lazy(() => import('./pages/account/Reservations').then(m => ({ default: m.ReservationDetail })))
const Transactions = lazy(() => import('./pages/account/Transactions').then(m => ({ default: m.Transactions })))
const Login = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.Login })))
const Register = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.Register })))
const Forgot = lazy(() => import('./pages/auth/Auth').then(m => ({ default: m.Forgot })))
const FarmIndex = lazy(() => import('./pages/FarmIndex').then(m => ({ default: m.FarmIndex })))
const FarmService = lazy(() => import('./pages/FarmService').then(m => ({ default: m.FarmService })))
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })))
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const ListingDetail = lazy(() => import('./pages/ListingDetail').then(m => ({ default: m.ListingDetail })))
const MapListings = lazy(() => import('./pages/MapListings').then(m => ({ default: m.MapListings })))
const Maps = lazy(() => import('./pages/Maps').then(m => ({ default: m.Maps })))
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })))
const OwnerFarm = lazy(() => import('./pages/OwnerFarm').then(m => ({ default: m.OwnerFarm })))
const WalletPage = lazy(() => import('./pages/Wallet').then(m => ({ default: m.WalletPage })))
const LiveWallet = lazy(() => import('./pages/LiveWallet').then(m => ({ default: m.LiveWallet })))

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
      <Suspense fallback={<p role="status" className="p-6 text-center">กำลังโหลดหน้า…</p>}>
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
          <Route path="wallet/live" element={<LiveWallet />} />
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
      </Suspense>
    </>
  )
}
