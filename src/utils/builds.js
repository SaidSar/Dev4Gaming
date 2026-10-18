// Utilidades de builds (sin acceso a datos)

export const PLATFORM_LABEL = {
  android: 'Android',
  windows: 'Windows',
  linux:   'Linux',
  macos:   'macOS',
  web:     'Navegador',
}

// Orden en el que se muestran las pestañas de plataforma
export const PLATFORM_ORDER = ['web', 'android', 'windows', 'macos', 'linux']

/** 52428800 → "50 MB" */
export function formatBytes(bytes) {
  if (!bytes) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value)} ${units[i]}`
}

/** Dispositivo del visitante: 'android' | 'ios' | 'windows' | 'macos' | 'linux' | null */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase()
  if (platform.includes('win')) return 'windows'
  if (platform.includes('mac')) return 'macos'
  if (platform.includes('linux')) return 'linux'
  return null
}

/**
 * Plataforma recomendada entre las disponibles: la del dispositivo; si no
 * hay build para él (o es iPhone), la web; si tampoco, la primera.
 */
export function recommendPlatform(platforms, device = detectPlatform()) {
  if (device && platforms.includes(device)) return device
  if (platforms.includes('web')) return 'web'
  return platforms[0]
}

export const DEVICE_LABEL = { ...PLATFORM_LABEL, ios: 'iPhone / iPad' }

/**
 * Builds web: solo https de itch.io o GitHub Pages (misma regla que el
 * CHECK builds_web_entry_check de la base).
 */
export function isAllowedWebUrl(url) {
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:'
      && /(^|\.)(itch\.io|github\.io)$/i.test(hostname)
  } catch {
    return false
  }
}

// ── Subida (panel del dev) ───────────────────────────────────

export const SUPABASE_MAX_BYTES = 50 * 1024 * 1024 // plan Free = bucket builds

/** Extensión permitida por plataforma (igual que el bucket y el CHECK) */
export const PLATFORM_EXT = {
  android: ['apk'],
  windows: ['zip'],
  macos:   ['zip'],
  linux:   ['zip'],
}

export function fileExtension(name) {
  return name.includes('.') ? name.split('.').pop().toLowerCase() : ''
}

/** SHA-256 en hex calculado en el navegador (Web Crypto) */
export async function sha256Hex(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Nombre seguro para la ruta del bucket */
export function safeFileName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80)
}
