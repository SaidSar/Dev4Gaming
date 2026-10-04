import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { signOut } from '../services/supabase'
import '../styles/auth.css'

const STATUS_LABEL = { pending: 'EN REVISIÓN', approved: 'VERIFICADO', rejected: 'RECHAZADO' }
const TYPE_LABEL   = { independent: 'Independiente', company: 'Empresa / estudio' }

function Profile() {
  const { user, displayName, verification } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <main className="auth fade-in">
      <div className="auth__card auth__card--wide">
        <h1 className="auth__title">{displayName}</h1>

        {verification ? (
          <span className={`auth__badge auth__badge--${verification.status}`}>
            DESARROLLADOR · {STATUS_LABEL[verification.status]}
          </span>
        ) : (
          <span className="auth__badge">JUGADOR</span>
        )}

        <div className="auth__rows">
          <div className="auth__row"><span>Correo</span><strong>{user.email}</strong></div>

          {verification && (
            <>
              <div className="auth__row"><span>Tipo</span><strong>{TYPE_LABEL[verification.type]}</strong></div>
              <div className="auth__row"><span>Nombre / razón social</span><strong>{verification.legal_name}</strong></div>
              {verification.website && (
                <div className="auth__row"><span>Sitio web</span><strong>{verification.website}</strong></div>
              )}
              {verification.portfolio_url && (
                <div className="auth__row"><span>Portafolio</span><strong>{verification.portfolio_url}</strong></div>
              )}
            </>
          )}
        </div>

        <div className="auth__actions">
          {!verification && (
            <Link to="/developer/verify" className="btn btn-secondary">Soy desarrollador</Link>
          )}
          {verification?.status === 'rejected' && (
            <Link to="/developer/verify" className="btn btn-secondary">Reenviar verificación</Link>
          )}
          <button type="button" className="btn btn-purple" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}

export default Profile