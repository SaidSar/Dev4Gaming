// Estado local del feedback: dispositivo, descargas recordadas (para el
// aviso "¿Ya lo probaste?") y candado de reseñas anónimas por sesión.
// Todo acceso a storage va en try/catch: sin storage, la UI sigue funcionando.

const DOWNLOADS_KEY = 'd4g_downloads'           // localStorage: { [game_id]: {build_id, version, platform, at} }
const RATED_KEY     = 'd4g_rated_builds'        // localStorage: [build_id, ...]
const ANON_KEY      = 'd4g_anon_reviews'        // sessionStorage: [game_id, ...]

function read(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* sin storage: el aviso o el candado simplemente no persisten */
  }
}

// ── Dispositivo ──────────────────────────────────────────────

/**
 * Datos del dispositivo para el reporte de bug. Usa userAgentData cuando
 * existe (Chromium) y cae al userAgent clásico en el resto.
 */
export async function getDeviceInfo() {
  const info = {
    user_agent: navigator.userAgent,
    language:   navigator.language,
    screen:     `${window.screen.width}x${window.screen.height}`,
    viewport:   `${window.innerWidth}x${window.innerHeight}`,
    pixel_ratio: window.devicePixelRatio,
  }
  const uad = navigator.userAgentData
  if (uad) {
    info.platform = uad.platform
    info.mobile = uad.mobile
    info.browser = uad.brands?.map(b => `${b.brand} ${b.version}`).join(', ')
    try {
      const hi = await uad.getHighEntropyValues(['platformVersion', 'model', 'architecture'])
      Object.assign(info, {
        platform_version: hi.platformVersion,
        model: hi.model || undefined,
        architecture: hi.architecture,
      })
    } catch {
      /* el navegador puede negar los valores de alta entropía */
    }
  } else {
    info.platform = navigator.platform
  }
  return info
}

/** Resumen legible: "Windows 15.0 · Chrome 141 · 1920x1080" */
export function describeDevice(info) {
  if (!info) return 'Detectando…'
  const os = [info.platform, info.platform_version].filter(Boolean).join(' ')
  // Prefiere la marca real (Chrome, Edge…); si solo hay Chromium, úsala
  const brands = info.browser?.split(', ').filter(b => !/Not.?A.?Brand/i.test(b)) ?? []
  const browser = brands.find(b => !/Chromium/i.test(b)) ?? brands[0]
  return [os, info.model, browser, info.screen].filter(Boolean).join(' · ')
}

// ── Descargas y aviso para calificar ─────────────────────────

export function rememberDownload(gameId, build) {
  const all = read(localStorage, DOWNLOADS_KEY, {})
  all[gameId] = { build_id: build.id, version: build.version, platform: build.platform, at: Date.now() }
  write(localStorage, DOWNLOADS_KEY, all)
}

/** Última descarga de este juego aún sin calificar (o null) */
export function getPendingRating(gameId) {
  const download = read(localStorage, DOWNLOADS_KEY, {})[gameId]
  if (!download) return null
  const rated = read(localStorage, RATED_KEY, [])
  return rated.includes(download.build_id) ? null : download
}

/** Calificada o descartada: el aviso no vuelve para ese build */
export function markRated(buildId) {
  if (!buildId) return
  const rated = read(localStorage, RATED_KEY, [])
  if (!rated.includes(buildId)) write(localStorage, RATED_KEY, [...rated, buildId].slice(-200))
}

// ── Candado de reseñas anónimas (1 por juego por sesión) ─────

export function hasAnonReview(gameId) {
  return read(sessionStorage, ANON_KEY, []).includes(gameId)
}

export function lockAnonReview(gameId) {
  const games = read(sessionStorage, ANON_KEY, [])
  if (!games.includes(gameId)) write(sessionStorage, ANON_KEY, [...games, gameId])
}
