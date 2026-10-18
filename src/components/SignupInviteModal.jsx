// Ventana emergente que invita a crear cuenta. No bloquea nada: se cierra con
// Escape, la X, clic en el overlay o "Seguir explorando sin cuenta".
// Cuándo se abre lo decide useSignupInvite.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import '../styles/signupInviteModal.css'

const BENEFITS = [
  'Acceso anticipado a todos los juegos en beta',
  'Tus reseñas y reportes de bugs con tu nombre',
  'Sin costo y sin tarjeta, ni ahora ni después',
]

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function SignupInviteModal({ open, registerHref, loginHref, onDismiss, onCta }) {
  const dialogRef = useRef(null)
  const ctaRef = useRef(null)
  // Mantiene el callback actual sin re-ejecutar el efecto de apertura
  const dismissRef = useRef(onDismiss)

  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement
    const root = document.getElementById('root')
    const { overflow, paddingRight } = document.body.style
    const scrollbar = window.innerWidth - document.documentElement.clientWidth

    // Bloquea el scroll (compensando la barra para que no salte el layout)
    // y saca el resto de la página del foco y del lector de pantalla.
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    root?.setAttribute('inert', '')
    ctaRef.current?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissRef.current('escape')
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return

      // Atrapa el foco dentro de la ventana
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      } else if (!dialogRef.current.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      root?.removeAttribute('inert')
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="signup-invite"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss('overlay') }}
    >
      <div
        ref={dialogRef}
        className="signup-invite__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-invite-title"
        aria-describedby="signup-invite-desc"
      >
        <button
          type="button"
          className="signup-invite__close"
          aria-label="Cerrar"
          onClick={() => onDismiss('x')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Mismo logotipo que el navbar */}
        <p className="signup-invite__logo">
          Dev4<span className="signup-invite__logo-accent">Gaming</span>
        </p>

        <div className="signup-invite__text">
          <h2 id="signup-invite-title" className="signup-invite__title">
            Prueba juegos indie <span className="signup-invite__title-accent">totalmente gratis</span>
          </h2>
          <p id="signup-invite-desc" className="signup-invite__desc">
            Crea tu cuenta de jugador en menos de un minuto y juega antes de que salgan.
          </p>
        </div>

        <ul className="signup-invite__benefits">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="signup-invite__benefit">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="signup-invite__actions">
          <Link
            ref={ctaRef}
            to={registerHref}
            className="signup-invite__cta"
            onClick={() => onCta('registro')}
          >
            Crear cuenta gratis
          </Link>
          <p className="signup-invite__login">
            ¿Ya tienes cuenta?{' '}
            <Link to={loginHref} onClick={() => onCta('login')}>Inicia sesión</Link>
          </p>
        </div>

        <button
          type="button"
          className="signup-invite__skip"
          onClick={() => onDismiss('seguir')}
        >
          Seguir explorando sin cuenta
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default SignupInviteModal
