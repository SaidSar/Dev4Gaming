import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import '../styles/landing.css'

const FEATURES = [
  {
    icon: '🎮',
    title: 'Para jugadores',
    description:
      'Accede a juegos beta antes que nadie. Tu reseña no es solo un número — es el parche de la próxima versión.',
  },
  {
    icon: '🛠️',
    title: 'Para desarrolladores',
    description:
      'Sube tu juego en beta y recibe feedback directo de jugadores reales. Sin filtros, sin intermediarios.',
  },
  {
    icon: '⭐',
    title: 'Reseñas que importan',
    description:
      'Califica del 1 al 5, deja comentarios y reporta bugs. El sistema que convierte opiniones en decisiones.',
  },
]


function Landing() {
  const { user, verification } = useAuth()
  const devPath = !user
    ? '/login?role=developer'
    : verification ? '/profile' : '/developer/verify'
  return (
    <main className="landing">

      {/* ══ HERO ══════════════════════════════════════ */}
      <section className="hero">
        <div className="hero__glow hero__glow--blue"   aria-hidden="true" />
        <div className="hero__glow hero__glow--purple" aria-hidden="true" />

        <div className="container hero__content fade-in">

          <div className="hero__badge">
            <span aria-hidden="true">🎮</span>
            Beta abierta — 3 juegos disponibles
          </div>

          <h1 className="hero__title">
            Los mejores juegos<br />
            <span className="text-blue">nacen de tu opinión.</span>
          </h1>

          <p className="hero__subtitle">
            Plataforma para desarrolladores indie y jugadores que quieren
            moldear el futuro del gaming antes del lanzamiento.
          </p>

          <div className="hero__ctas">
            <Link to="/games" className="btn btn-primary">
              Explorar juegos
            </Link>
            <Link to={devPath} className="btn btn-secondary">
              Soy desarrollador
            </Link>
          </div>

        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════ */}
      <section className="features">
        <div className="container">
          <h2 className="features__heading">¿Por qué Dev4Gaming?</h2>
          <div className="features__grid">
            {FEATURES.map((f, i) => (
              <article key={i} className="feature-card card">
                <span className="feature-card__icon" aria-hidden="true">
                  {f.icon}
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