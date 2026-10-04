import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function ProtectedRoute({ children, loginTo = '/login' }) {
  const { user, loading } = useAuth()

  if (loading) return <div className="container auth-loading">Cargando...</div>
  if (!user) return <Navigate to={loginTo} replace />

  return children
}

export default ProtectedRoute