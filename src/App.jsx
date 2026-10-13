import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import CampaignBanner from './components/CampaignBanner'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Catalog from './pages/Catalog'
import GameDetail from './pages/GameDetail'
import Login from './pages/Login'
import Profile from './pages/Profile'
import VerifyDeveloper from './pages/VerifyDeveloper'
import { captureUtm } from './utils/utm'
import './styles/global.css'

// Compatibilidad con los links viejos /games/:id
function LegacyGameRedirect() {
  const { id } = useParams()
  return <Navigate to={`/juego/${id}`} replace />
}

function App() {
  // Inicializador perezoso: captura los UTM una sola vez al montar la app
  const [utm] = useState(captureUtm)

  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <CampaignBanner source={utm.utm_source} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/games" element={<Catalog />} />
          <Route path="/juego/:id" element={<GameDetail />} />
          <Route path="/games/:id" element={<LegacyGameRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/profile"
            element={<ProtectedRoute><Profile /></ProtectedRoute>}
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
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
