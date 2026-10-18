// Eventos del embudo de conversión (Supabase + GA4 si está cargado).
// Nunca lanza: un fallo de medición no debe romper la experiencia.
import { insertConversionEvent, getCurrentUserId } from '../services/supabase'
import { getUtm } from './utm'

/**
 * Evento solo de GA4 (no va a conversion_events). No hace nada si gtag
 * no está cargado — hoy index.html no incluye el snippet de GA4.
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
 * @param {'sign_up'|'submit_review'|'download_click'|'play_click'} event
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
