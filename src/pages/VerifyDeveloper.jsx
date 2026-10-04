import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { submitVerification } from '../services/supabase'
import '../styles/auth.css'

const STATUS_LABEL = { pending: 'EN REVISIÓN', approved: 'VERIFICADO', rejected: 'RECHAZADO' }

function VerifyDeveloper() {
  const { user, verification, refresh } = useAuth()
  const [form, setForm] = useState({
    type: 'independent', legal_name: '', website: '', portfolio_url: '', tax_id: '',
  })
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  const showForm = !verification || verification.status === 'rejected'
  const isCompany = form.type === 'company'
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.legal_name.trim()) return setError('Escribe tu nombre o razón social.')
    if (!form.website.trim() && !form.portfolio_url.trim()) {
      return setError('Agrega al menos un sitio web o portafolio.')
    }

    setBusy(true)
    try {
      await submitVerification(user.id, {
        type: form.type,
        legal_name: form.legal_name.trim(),
        website: form.website.trim() || null,
        portfolio_url: form.portfolio_url.trim() || null,
        tax_id: form.tax_id.trim() || null,
      })
      await refresh()
    } catch {
      setError('No se pudo enviar la solicitud. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (!showForm) {
    return (
      <main className="auth fade-in">
        <div className="auth__card auth__card--wide">
          <h1 className="auth__title">Verificación de desarrollador</h1>
          <span className={`auth__badge auth__badge--${verification.status}`}>
            {STATUS_LABEL[verification.status]}
          </span>
          <p className="auth__hint">
            {verification.status === 'approved'
              ? 'Tu cuenta de desarrollador está verificada.'
              : 'Recibimos tus datos. Los revisaremos y tu estado cambiará aquí y en tu perfil.'}
          </p>
          <div className="auth__actions">
            <Link to="/profile" className="btn btn-primary">Ir a mi perfil</Link>
            <Link to="/games" className="btn btn-secondary">Ver catálogo</Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="auth fade-in">
      <div className="auth__card auth__card--wide">
        <h1 className="auth__title">Verifícate como desarrollador</h1>
        <p className="auth__hint">
          {verification?.status === 'rejected'
            ? 'Tu solicitud fue rechazada. Corrige tus datos y vuelve a enviarla.'
            : 'Cuéntanos quién eres para revisar tu cuenta.'}
        </p>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="auth__types">
            <button type="button"
              className={`auth__type ${!isCompany ? 'auth__type--active' : ''}`}
              onClick={() => setForm(f => ({ ...f, type: 'independent' }))}>
              Independiente
            </button>
            <button type="button"
              className={`auth__type ${isCompany ? 'auth__type--active' : ''}`}
              onClick={() => setForm(f => ({ ...f, type: 'company' }))}>
              Empresa / estudio
            </button>
          </div>

          <div className="auth__field">
            <label htmlFor="dv-name">{isCompany ? 'Razón social o nombre del estudio' : 'Nombre completo'}</label>
            <input id="dv-name" type="text" maxLength={120}
              value={form.legal_name} onChange={set('legal_name')} />
          </div>

          <div className="auth__field">
            <label htmlFor="dv-web">Sitio web</label>
            <input id="dv-web" type="url" placeholder="https://"
              value={form.website} onChange={set('website')} />
          </div>

          <div className="auth__field">
            <label htmlFor="dv-port">Portafolio (itch.io, GitHub, Steam...)</label>
            <input id="dv-port" type="url" placeholder="https://"
              value={form.portfolio_url} onChange={set('portfolio_url')} />
          </div>

          <div className="auth__field">
            <label htmlFor="dv-tax">RFC o ID fiscal (opcional)</label>
            <input id="dv-tax" type="text" maxLength={30}
              value={form.tax_id} onChange={set('tax_id')} />
          </div>

          {error && <p className="auth__error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Enviando...' : 'Enviar para revisión'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default VerifyDeveloper