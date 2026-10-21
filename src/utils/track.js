// Eventos del embudo de conversión (Supabase + GA4 si está cargado).
// Nunca lanza: un fallo de medición no debe romper la experiencia.
import { insertConversionEvent, getCurrentUserId } from '../services/supabase'
import { getUtm } from './utm'

const GA_ID = import.meta.env.VITE_GA_ID
let gaStarted = false
let lastPageKey = null

/**
 * Carga gtag.js una sola vez si VITE_GA_ID es un ID de GA4 válido; sin él
 * no se define window.gtag y todo el tracking de GA4 queda en no-op.
 * send_page_view: false porque la SPA manda page_view por ruta (trackPageView).
 */
export function initAnalytics() {
  if (gaStarted || typeof window === 'undefined') return
  if (!/^G-[A-Z0-9]+$/.test(GA_ID ?? '')) return
  gaStarted = true

  window.dataLayer = window.dataLayer || []
  // gtag necesita el objeto `arguments`, no un array con rest params
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function gtag() { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    send_page_view: false,
    // DebugView: GA4 ignora debug_mode:false, así que solo se manda en dev
    ...(import.meta.env.DEV ? { debug_mode: true } : {}),
  })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
}

/**
 * page_view manual en cada cambio de ruta. Ignora la misma URL repetida
 * (StrictMode ejecuta los efectos dos veces en desarrollo). El primero lleva
 * la campaña guardada por captureUtm() por si una redirección quitó el query.
 */
export function trackPageView() {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  const { href, pathname, search } = window.location
  const key = pathname + search
  if (key === lastPageKey) return
  const isFirst = lastPageKey === null
  lastPageKey = key

  const utm = getUtm()
  const campaign = isFirst && utm.utm_source !== 'direct'
    ? Object.fromEntries(Object.entries({
        campaign_source:  utm.utm_source,
        campaign_medium:  utm.utm_medium,
        campaign_name:    utm.utm_campaign,
        campaign_content: utm.utm_content,
      }).filter(([, v]) => v))
    : {}

  try {
    window.gtag('event', 'page_view', {
      page_location: href,
      page_path: key,
      page_title: document.title,
      ...campaign,
    })
  } catch (err) {
    console.warn('[track] gtag falló para "page_view"', err)
  }
}

/**
 * Evento solo de GA4 (no va a conversion_events). No hace nada si gtag
 * no está cargado (sin VITE_GA_ID).
 * @param {string} event - p. ej. 'hero_video_play'
 * @param {object} params
 */
export function trackEvent(event, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  try {
    window.gtag('event', event, { ...getUtm(), ...params })
  } catch (err) {
    console.warn(`[track] gtag falló para "${event}"`, err)
  }
}

/**
 * User property `user_role` de GA4 para segmentar el embudo por público:
 * 'anonymous' | 'player' | 'dev_pending' | 'dev_verified' | 'admin'.
 * No-op sin gtag (igual que trackEvent).
 */
export function setUserRole(role) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  try {
    window.gtag('set', 'user_properties', { user_role: role })
  } catch (err) {
    console.warn('[track] gtag falló al fijar user_role', err)
  }
}

/**
 * @param {'sign_up'|'submit_review'|'download_click'|'play_click'|'hero_video_play'|'hero_cta_click'} event
 * @param {object} extra - p. ej. { game_id, rating }
 */
export async function trackConversion(event, extra = {}) {
  const utm = getUtm()

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, { ...utm, ...extra })
    }
  } catch (err) {
    console.warn(`[track] gtag falló para "${event}"`, err)
  }

  try {
    await insertConversionEvent({
      event,
      game_id:      extra.game_id ?? null,
      user_id:      await getCurrentUserId(),
      utm_source:   utm.utm_source ?? null,
      utm_medium:   utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
    })
  } catch (err) {
    console.warn(`[track] no se pudo registrar "${event}"`, err)
  }
}
