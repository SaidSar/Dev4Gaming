// Eventos del embudo de conversión (Supabase + GA4 si está cargado).
// Nunca lanza: un fallo de medición no debe romper la experiencia.
import { insertConversionEvent, getCurrentUserId } from '../services/supabase'
import { getUtm } from './utm'

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
