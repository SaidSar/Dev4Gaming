// Landing para desarrolladores (/desarrolladores): segundo público del sitio.
// El CTA cambia según el estado: registro → verificación → panel.
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { devEntryPath, isVerifiedDev } from '../utils/roles'
import '../styles/developers.css'

const BENEFITS = [
  {
    title: 'Reportes estructurados',
    text: 'Cada bug llega con versión, severidad, pasos para reproducirlo, dispositivo y captura. Nada de "no me funciona".',
  },
  {
    title: 'Feedback por versión',
    text: 'Reseñas y bugs quedan ligados al build exacto, así comparas la v0.3 contra la v0.4 con datos.',
  },
  {
    title: 'Métricas reales',
    text: 'Descargas firmadas (no clics), rating promedio, bugs por severidad y conversión de descarga a reseña.',
  },
  {
    title: 'Testers que quieren jugar',
    text: 'Una comunidad que busca juegos indie en beta para probarlos antes que nadie.',
  },
]

const STEPS = [
  { title: 'Crea tu cuenta', text: 'Regístrate y elige "Quiero publicar mi juego".' },
  { title: 'Verifícate', text: 'Cuéntanos si eres independiente o estudio; revisamos tu solicitud a mano.' },
  { title: 'Sube tu build', text: 'APK o ZIP de hasta 50 MB, un enlace externo o tu versión web de itch.io / GitHub Pages.' },
  { title: 'Publica y escucha', text: 'Publica la versión, comparte el link y revisa reseñas, bugs y métricas en tu panel.' },
]

function ctaLabel(user, verified, verification) {
  if (!user) return 'Publicar mi beta'
  if (verified) return 'Ir a mi panel'
  if (verification) return 'Ver mi solicitud'
  return 'Solicitar verificación'
}

function Developers() {
  const { user, profile, verification } = useAuth()
  const verified = isVerifiedDev(profile, verification)
  const ctaPath = devEntryPath(user, profile, verification)

  return (
    <main className="devs">
      <section className="devs__hero">
        <div className="devs__inner">
          <span className="devs__badge">Para desarrolladores indie</span>
          <h1 className="devs__title">
            Recibe feedback real<br />
            <span className="devs__title-accent">antes de lanzar.</span>
          </h1>
          <p className="devs__lead">
            Publica la beta de tu juego, deja que testers la descarguen o la jueguen en el
            navegador, y recibe reseñas y reportes de bugs ligados a cada versión.
          </p>
          <div className="devs__ctas">
            <Link to={ctaPath} className="devs__cta devs__cta--primary">
              {ctaLabel(user, verified, verification)}
            </Link>
            <Link to="/games" className="devs__cta devs__cta--ghost">Ver el catálogo</Link>
          </div>
        </div>
      </section>

      <section className="devs__section" aria-labelledby="devs-benefits">
        <div className="devs__inner">
          <h2 id="devs-benefits" className="devs__h2">Qué obtienes</h2>
          <ul className="devs__grid">
            {BENEFITS.map(b => (
              <li key={b.title} className="devs__card">
                <h3 className="devs__card-title">{b.title}</h3>
                <p className="devs__card-text">{b.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="devs__section" aria-labelledby="devs-steps">
        <div className="devs__inner">
          <h2 id="devs-steps" className="devs__h2">Cómo funciona</h2>
          <ol className="devs__steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="devs__step">
                <span className="devs__step-num" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="devs__card-title">{s.title}</h3>
                  <p className="devs__card-text">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="devs__section" aria-labelledby="devs-trust">
        <div className="devs__inner devs__trust">
          <h2 id="devs-trust" className="devs__h2">Para que los testers confíen en tu build</h2>
          <ul className="devs__checklist">
            <li>Firma tu APK con tu keystore de release (un APK debug genera desconfianza).</li>
            <li>Mostramos el SHA-256 de cada archivo; revisa tu build en VirusTotal antes de publicarlo.</li>
            <li>Los archivos viven en almacenamiento privado y se descargan con enlaces temporales.</li>
            <li>¿Tu juego pesa más de 50 MB? Usa GitHub Releases u otro host y registra el enlace.</li>
          </ul>
          <Link to={ctaPath} className="devs__cta devs__cta--primary">
            {ctaLabel(user, verified, verification)}
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Developers
