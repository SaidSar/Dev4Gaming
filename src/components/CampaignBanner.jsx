// Mensaje de bienvenida para visitantes que llegan desde una campaña
import { useState } from 'react'
import Icon from './Icon'
import '../styles/campaignBanner.css'

const SOURCE_LABELS = {
  tiktok:    'TikTok',
  instagram: 'Instagram',
  discord:   'nuestro Discord',
  email:     'tu correo',
}

const CLOSED_KEY = 'd4g_banner_closed'

function wasClosed() {
  try {
    return sessionStorage.getItem(CLOSED_KEY) === '1'
  } catch {
    return false
  }
}

function CampaignBanner({ source }) {
  const [closed, setClosed] = useState(wasClosed)
  const label = SOURCE_LABELS[source]

  if (!label || closed) return null

  function handleClose() {
    setClosed(true)
    try {
      sessionStorage.setItem(CLOSED_KEY, '1')
    } catch {
      // Si no se puede guardar, solo se oculta hasta recargar
    }
  }

  return (
    <aside className="campaign-banner" aria-label="Mensaje de bienvenida">
      <div className="container campaign-banner__inner">
        <p className="campaign-banner__text">
          <Icon name="gamepad" size={18} className="campaign-banner__icon" />
          ¡Bienvenido desde {label}! Prueba este juego indie gratis y deja tu reseña.
        </p>
        <button
          type="button"
          className="campaign-banner__close"
          onClick={handleClose}
          aria-label="Cerrar mensaje de bienvenida"
        >
          ×
        </button>
      </div>
    </aside>
  )
}

export default CampaignBanner
