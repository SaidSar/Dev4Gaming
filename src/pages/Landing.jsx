import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getHomeStats } from '../services/supabase'
import { devEntryPath } from '../utils/roles'
import Icon from '../components/Icon'
import HeroInfluencer from '../components/HeroInfluencer'
import '../styles/landing.css'

// Campaña del hero: Reel promocional 9:16 (24 s, subtítulos incrustados).
// Versiones web en public/media/ generadas con ffmpeg desde el original de
// 1080x1920 (que se queda fuera del repo, para redes): WebM VP9 + MP4 H.264
// 720x1280 con faststart y poster JPG del segundo 1. Ajusta handle, nombre,
// juego y reviewHref (p. ej. la URL de su reseña en TikTok).
const HERO_CAMPAIGN = {
  sources: [
    { src: '/media/dev4gaming-promo.webm', type: 'video/webm' },
    { src: '/media/dev4gaming-promo.mp4',  type: 'video/mp4' },
  ],
  posterSrc:        '/media/dev4gaming-promo-poster.jpg',
  videoLabel:       'Video promocional de Dev4Gaming',
  influencerHandle: '@influencer',
  influencerName:   'Influencer',
  gameId:           '5d2be034-b5a1-4116-9c61-6642fcddb0b4', // Shadow Forge
  gameTitle:        'Shadow Forge',
  duration:         '0:24',
  reviewHref:       '/juego/5d2be034-b5a1-4116-9c61-6642fcddb0b4',
}

const FEATURES = [
  {
    icon: 'gamepad',
    title: 'Para jugadores',
    description:
      'Accede a juegos beta antes que nadie. Tu reseña no es solo un número — es el parche de la próxima versión.',
  },
  {
    icon: 'rocket',
    title: 'Para desarrolladores',
    description:
      'Sube tu juego en beta y recibe feedback directo de jugadores reales. Sin filtros, sin intermediarios.',
  },
  {
    icon: 'star',
    title: 'Reseñas que importan',
    description:
      'Califica del 1 al 5, deja comentarios y reporta bugs. El sistema que convierte opiniones en decisiones.',
  },
]


function Landing() {
  const { user, profile, verification } = useAuth()
  const devPath = devEntryPath(user, profile, verification)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    let active = true
    getHomeStats()
      .then((data) => { if (active) setStats(data) })
      .catch((err) => console.warn('[landing] no se pudieron cargar los conteos', err))
      .finally(() => { if (active) setStatsLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <main className="landing">

      <HeroInfluencer
        {...HERO_CAMPAIGN}
        developerHref={devPath}
        stats={stats}
        statsLoading={statsLoading}
      />

      {/* ══ FRANJA DEVS (secundaria: no compite con el CTA de jugador) ══ */}
      <aside className="dev-strip" aria-label="Para desarrolladores">
        <div className="container dev-strip__inner">
          <p className="dev-strip__text">
            <strong>¿Desarrollas juegos?</strong> Publica tu beta y recibe reseñas y bugs por versión.
          </p>
          <Link to="/desarrolladores" className="dev-strip__link">
            Conoce cómo funciona <span aria-hidden="true">→</span>
          </Link>
        </div>
      </aside>

      {/* ══ FEATURES ══════════════════════════════════ */}
      <section className="features">
        <div className="container">
          <h2 className="features__heading">¿Por qué Dev4Gaming?</h2>
          <div className="features__grid">
            {FEATURES.map((f, i) => (
              <article key={i} className="feature-card card">
                <span className="feature-card__icon">
                  <Icon name={f.icon} size={24} />
                </span>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA FINAL ═════════════════════════════════ */}
      <section className="cta-final">
        <div className="container cta-final__inner">
          <h2 className="cta-final__title">
            ¿Listo para probar<br />
            <span className="text-blue">el próximo gran indie?</span>
          </h2>
          <Link to="/games" className="btn btn-primary">
            Ver catálogo
          </Link>
        </div>
      </section>

    </main>
  )
}

export default Landing