import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { signIn, signUp } from '../services/supabase'
import { useAuth } from '../context/useAuth'
import '../styles/auth.css'

function friendlyError(err) {
  const msg = err?.message || ''
  if (msg.includes('Invalid login')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('already registered')) return 'Ese correo ya está registrado.'
  if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.'
  return 'No se pudo completar la solicitud. Intenta de nuevo.'
}

function Login() {
  const [params] = useSearchParams()
  const wantsDev = params.get('role') === 'developer'
  const { user, loading } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo]   = useState(null)

  if (!loading && user) {
    return <Navigate to={wantsDev ? '/developer/verify' : '/'} replace />
  }

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const email = form.email.trim()
    if (!email || !form.password) return setError('Completa correo y contraseña.')
    if (mode === 'register') {
      if (!form.displayName.trim()) return setError('Escribe tu nombre.')
      if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn({ email, password: form.password })
      } else {
        const data = await signUp({
          email,
          password: form.password,
          displayName: form.displayName.trim(),
        })
        if (!data.session) {
          setInfo('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.')
          setMode('login')
        }
      }
      // Si hay sesión, AuthContext actualiza y el <Navigate> de arriba redirige.
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth fade-in">
      <div className="auth__card">
        <h1 className="auth__title">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

        {wantsDev && (
          <p className="auth__hint">
            Entra o regístrate para verificarte como desarrollador.
          </p>
        )}

        <div className="auth__tabs">
          <button
            type="button"
            className={`auth__tab ${mode === 'login' ? 'auth__tab--active' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`auth__tab ${mode === 'register' ? 'auth__tab--active' : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            Registrarse
          </button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div className="auth__field">
              <label htmlFor="au-name">Nombre</label>
              <input id="au-name" type="text" maxLength={50} placeholder="¿Cómo te llamas?"
                value={form.displayName} onChange={set('displayName')} />
            </div>
          )}

          <div className="auth__field">
            <label htmlFor="au-email">Correo</label>
            <input id="au-email" type="email" autoComplete="email" placeholder="tu@correo.com"
              value={form.email} onChange={set('email')} />
          </div>

          <div className="auth__field">
            <label htmlFor="au-pass">Contraseña</label>
            <input id="au-pass" type="password" placeholder="Mínimo 6 caracteres"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password} onChange={set('password')} />
          </div>

          {info && <p className="auth__info">{info}</p>}
          {error && <p className="auth__error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login