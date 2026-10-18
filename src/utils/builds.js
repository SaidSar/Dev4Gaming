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

/** Plataforma del visitante, para preseleccionar su build */
export function detectPlatform() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'web'
  const platform = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase()
  if (platform.includes('win')) return 'windows'
  if (platform.includes('mac')) return 'macos'
  if (platform.includes('linux')) return 'linux'
  return null
}

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
