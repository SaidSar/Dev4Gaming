// Reglas de rol compartidas (navbar, login, landing de devs, panel).
// Fuente de verdad: developer_verifications.status; profiles.role la
// replica por trigger (y es la única forma de marcar 'admin').

export function isVerifiedDev(profile, verification) {
  return ['dev_verified', 'admin'].includes(profile?.role)
    || verification?.status === 'approved'
}

/** Destino del CTA "publicar mi juego" según el estado del usuario */
export function devEntryPath(user, profile, verification) {
  if (!user) return '/login?mode=register&role=developer'
  if (isVerifiedDev(profile, verification)) return '/dev/dashboard'
  if (verification) return '/profile'           // pendiente o rechazada
  return '/developer/verify'
}

/** Solo rutas internas: evita redirecciones abiertas (?redirect=https://… o //host) */
export function safeRedirect(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

/**
 * A dónde va alguien que acaba de iniciar sesión o registrarse:
 * 1. ?role=developer → verificación (o su panel si ya está verificado)
 * 2. ?redirect=      → la página donde estaba (ventana de invitación, ficha…)
 * 3. según su rol    → panel, perfil, verificación pendiente o catálogo
 */
export function postLoginPath({ wantsDev, redirect, profile, verification }) {
  const verified = isVerifiedDev(profile, verification)
  if (wantsDev) return verified ? '/dev/dashboard' : verification ? '/profile' : '/developer/verify'
  if (redirect) return redirect
  if (verified) return '/dev/dashboard'
  if (verification) return '/profile'
  if (profile?.signup_intent === 'developer') return '/developer/verify'
  return '/games'
}
