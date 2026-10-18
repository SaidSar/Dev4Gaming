// Decide cuándo mostrar la invitación a registrarse (SignupInviteModal):
// sin sesión, solo en catálogo / ficha de juego, 3 s después de entrar,
// una vez por sesión del navegador y nunca mientras se escribe una reseña.
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { trackEvent } from '../utils/track'

const STORAGE_KEY = 'd4g_signup_invite'
const DELAY_MS = 3000

// Marca que llevan los elementos que no deben interrumpirse (p. ej. ReviewForm)
const BUSY_SELECTOR = '[data-no-signup-invite]'

function pageFor(pathname) {
  if (pathname === '/games') return 'catalogo'
  if (/^\/juego\/[^/]+\/?$/.test(pathname)) return 'juego'
  return null
}

function alreadySeen() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

function markSeen(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* sin storage (modo privado, etc.): se puede volver a mostrar, no es grave */
  }
}

function isUserBusy() {
  return Boolean(document.activeElement?.closest(BUSY_SELECTOR))
}

export function useSignupInvite() {
  const { user, loading } = useAuth()
  const { pathname, search, key } = useLocation()
  // Entrada del historial (location.key) donde se abrió la ventana
  const [openedAt, setOpenedAt] = useState(null)

  // Si se navegó con la ventana abierta, se da por cerrada (ya quedó en storage)
  if (openedAt && openedAt !== key) setOpenedAt(null)

  const page = pageFor(pathname)
  const open = openedAt === key && !user

  useEffect(() => {
    if (loading || user || !page || openedAt || alreadySeen()) return

    let timer
    const tryOpen = () => {
      // Si está escribiendo una reseña, se vuelve a intentar más tarde
      if (isUserBusy()) {
        timer = setTimeout(tryOpen, DELAY_MS)
        return
      }
      markSeen('shown')
      setOpenedAt(key)
      trackEvent('signup_modal_view', { page })
    }
    timer = setTimeout(tryOpen, DELAY_MS)
    return () => clearTimeout(timer)
  }, [loading, user, page, key, openedAt])

  const redirect = encodeURIComponent(pathname + search)

  function dismiss(method) {
    markSeen('dismissed')
    setOpenedAt(null)
    trackEvent('signup_modal_dismiss', { method, page })
  }

  function handleCta(action) {
    markSeen(action)
    setOpenedAt(null)
    trackEvent('signup_modal_cta', { action, page })
  }

  return {
    open,
    registerHref: `/login?mode=register&redirect=${redirect}`,
    loginHref: `/login?redirect=${redirect}`,
    dismiss,
    handleCta,
  }
}
