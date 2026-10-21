import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import CampaignBanner from './components/CampaignBanner'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import SignupInviteModal from './components/SignupInviteModal'
import Landing from './pages/Landing'
import { captureUtm } from './utils/utm'
import { trackPageView } from './utils/track'
import { useSignupInvite } from './hooks/useSignupInvite'
import './styles/global.css'

// Carga diferida por ruta: el bundle inicial solo lleva la landing.
// El panel del dev además es el único que trae tus-js-client.
const Catalog         = lazy(() => import('./pages/Catalog'))
const GameDetail      = lazy(() => import('./pages/GameDetail'))
const Login           = lazy(() => import('./pages/Login'))
const Profile         = lazy(() => import('./pages/Profile'))
const VerifyDeveloper = lazy(() => import('./pages/VerifyDeveloper'))
const DevDashboard    = lazy(() => import('./pages/DevDashboard'))
const Developers      = lazy(() => import('./pages/Developers'))

// Compatibilidad con los links viejos /games/:id
function LegacyGameRedirect() {
  const { id } = useParams()
  return <Navigate to={`/juego/${id}`} replace />
}

// page_view de GA4 en cada cambio de ruta (gtag no lo manda solo: SPA)
function PageViewTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => { trackPageView() }, [pathname, search])
  return null
}

// Invitación a registrarse; el hook decide ruta, sesión y momento
function SignupInvite() {
  const { open, registerHref, loginHref, dismiss, handleCta } = useSignupInvite()
  return (
    <SignupInviteModal
      open={open}
      registerHref={registerHref}
      loginHref={loginHref}
      onDismiss={dismiss}
      onCta={handleCta}
    />
  )
}

function App() {
  // Inicializador perezoso: captura los UTM una sola vez al montar la app
  const [utm] = useState(captureUtm)

  return (
    <BrowserRouter>
      <PageViewTracker />
      <AuthProvider>
        <Navbar />
        <CampaignBanner source={utm.utm_source} />
        <Suspense fallback={<div className="container auth-loading">Cargando...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/games" element={<Catalog />} />
          <Route path="/desarrolladores" element={<Developers />} />
          <Route path="/juego/:id" element={<GameDetail />} />
          <Route path="/games/:id" element={<LegacyGameRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
          />
          <Route
            path="/dev/dashboard"
            element={
              <ProtectedRoute loginTo="/login?redirect=%2Fdev%2Fdashboard">
                <DevDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developer/verify"
            element={
              <ProtectedRoute loginTo="/login?role=developer">
                <VerifyDeveloper />
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
        <Footer />
        <SignupInvite />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
