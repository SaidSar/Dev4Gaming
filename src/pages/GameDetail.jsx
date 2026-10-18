import { useEffect, useState } from 'react'
import { useParams, useLocation, useSearchParams, Link } from 'react-router-dom'
import { getGameById, getReviewsByGame, getPublishedBuilds, getDownloadUrl } from '../services/supabase'
import { useAuth } from '../context/useAuth'
import { trackConversion, trackEvent } from '../utils/track'
import { rememberDownload, getPendingRating, markRated } from '../utils/feedback'
import GameCover from '../components/GameCover'
import Icon from '../components/Icon'
import StarRating from '../components/StarRating'
import ReviewForm from '../components/ReviewForm'
import ReviewList from '../components/ReviewList'
import GameBuilds from '../components/GameBuilds'
import BugReportForm from '../components/BugReportForm'
import '../styles/gameDetail.css'

function GameDetail() {
  const { id } = useParams()
  const [game, setGame]       = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [builds, setBuilds]   = useState([])
  const { user } = useAuth()
  const { pathname, hash } = useLocation()
  const [params, setParams] = useSearchParams()
  // Versión elegida en reseña y bug ('' = no especificada)
  const [feedbackBuildId, setFeedbackBuildId] = useState('')
  // Aviso "¿Ya lo probaste?" tras descargar (persiste entre visitas)
  const [ratePrompt, setRatePrompt] = useState(null)
  const deepLinkBuild = params.get('build')

  useEffect(() => {
    async function fetchData() {
      try {
        // Si los builds fallan, la ficha sigue funcionando ("Build próximamente")
        const [gameData, reviewsData, buildsData] = await Promise.all([
          getGameById(id),
          getReviewsByGame(id),
          getPublishedBuilds(id).catch(() => []),
        ])
        setGame(gameData)
        setReviews(reviewsData)
        setBuilds(buildsData)

        // Versión por defecto: deep link ?build= → última descarga → la más reciente
        const ids = buildsData.map(b => b.id)
        const pending = getPendingRating(id)
        const linked = new URLSearchParams(window.location.search).get('build')
        setFeedbackBuildId(
          [linked, pending?.build_id, ids[0]].find(b => b && ids.includes(b)) ?? ''
        )
        if (pending && ids.includes(pending.build_id)) setRatePrompt(pending)
      } catch {
        setError('No se encontró el juego.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // Añade la reseña nueva al inicio sin re-fetch
  function handleReviewPosted(newReview) {
    setReviews(prev => [newReview, ...prev])
    if (ratePrompt && newReview.build_id === ratePrompt.build_id) setRatePrompt(null)
  }

  // Deep link ?build=…#resena: al cargar, baja al formulario de reseña
  useEffect(() => {
    if (!loading && hash === '#resena') {
      document.getElementById('resena')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, hash])

  // La Edge Function valida sesión y build, registra la descarga y firma la URL
  async function handleDownload(build) {
    const result = await getDownloadUrl(build.id)
    trackConversion('download_click', { game_id: id })
    trackEvent('build_download', {
      game_id: id, build_id: build.id, version: build.version, platform: build.platform,
    })
    rememberDownload(id, build)
    setFeedbackBuildId(build.id)
    setRatePrompt({ build_id: build.id, version: build.version, platform: build.platform })
    window.location.assign(result.url)
    return result
  }

  function goRate() {
    setFeedbackBuildId(ratePrompt.build_id)
    setParams({ build: ratePrompt.build_id }, { replace: true })
    const form = document.getElementById('resena')
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    form?.querySelector('.review-form__star')?.focus({ preventScroll: true })
  }

  function dismissRatePrompt() {
    markRated(ratePrompt.build_id)
    setRatePrompt(null)
  }

  // Promedio y distribución derivados del estado
  const count = reviews.length
  const avgRating = count
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
    : 0
  const distribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    total: reviews.filter(r => r.rating === star).length,
  }))

  // ── Loading ──────────────────────────────────
  if (loading) return (
    <div className="gd-loading container fade-in">
      <div className="gd-skeleton gd-skeleton--banner" />
      <div className="gd-skeleton-body">
        <div className="gd-skeleton gd-skeleton--line" style={{ width: '55%', height: '2rem' }} />
        <div className="gd-skeleton gd-skeleton--line" style={{ width: '30%' }} />
        <div className="gd-skeleton gd-skeleton--line" />
        <div className="gd-skeleton gd-skeleton--line" style={{ width: '80%' }} />
      </div>
    </div>
  )

  // ── Error ────────────────────────────────────
  if (error || !game) return (
    <div className="gd-error container">
      <Icon name="alert" size={44} className="gd-error__icon" />
      <p>{error || 'Juego no encontrado.'}</p>
      <Link to="/games" className="btn btn-secondary">
        <Icon name="back" size={16} />
        Volver al catálogo
      </Link>
    </div>
  )

  // ── Vista principal ──────────────────────────
  return (
    <main className="game-detail fade-in">
      <div className="container">

        <Link to="/games" className="game-detail__back">
          <Icon name="back" size={14} />
          Catálogo
        </Link>

        <div className="game-detail__layout">

          {/* ── Columna izquierda: juego ── */}
          <div className="game-detail__main">
            <GameCover
              src={game.cover_url}
              title={game.title}
              genre={game.genre}
              className="game-detail__cover"
            />

            <div className="game-detail__badges">
              {game.genre && (
                <span className="game-detail__genre">{game.genre}</span>
              )}
              <span className={`game-detail__status game-detail__status--${game.status}`}>
                {game.status === 'beta' ? 'BETA' : 'RELEASED'}
              </span>
              {game.is_academic && <span className="badge-academic">PROYECTO ACADÉMICO</span>}
            </div>

            <h1 className="game-detail__title">{game.title}</h1>
            <p className="game-detail__dev">por {game.developer_name}</p>
            {game.credits && (
              <p className="game-detail__credits">Créditos: {game.credits}</p>
            )}

            <div className="game-detail__rating">
              {count > 0 ? (
                <>
                  <StarRating value={avgRating} size="lg" />
                  <span className="game-detail__rating-value">{avgRating.toFixed(1)}</span>
                  <span className="game-detail__rating-count">
                    ({count} {count === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </>
              ) : (
                <span className="game-detail__rating-count">Sin reseñas aún, sé el primero</span>
              )}
            </div>

            {game.description && (
              <p className="game-detail__description">{game.description}</p>
            )}

            {/* ── Descarga / juego en el navegador ── */}
            <GameBuilds
              key={id}
              initialBuildId={deepLinkBuild}
              game={game}
              builds={builds}
              signedIn={Boolean(user)}
              loginHref={`/login?redirect=${encodeURIComponent(pathname)}`}
              onDownload={handleDownload}
            />

            {ratePrompt && (
              <div className="game-detail__rate-prompt" role="status">
                <p>
                  <strong>¿Ya probaste la v{ratePrompt.version}?</strong>{' '}
                  Califícala: tu opinión llega directo al equipo.
                </p>
                <div className="game-detail__rate-actions">
                  <button type="button" className="btn btn-purple" onClick={goRate}>
                    Calificar ahora
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={dismissRatePrompt}>
                    Ahora no
                  </button>
                </div>
              </div>
            )}

            {/* ── Distribución de calificaciones ── */}
            <section className="game-detail__dist" aria-labelledby="gd-dist-title">
              <h2 id="gd-dist-title" className="game-detail__section-title">Calificaciones</h2>
              <ul className="game-detail__dist-list">
                {distribution.map(({ star, total }) => {
                  const pct = count ? Math.round((total / count) * 100) : 0
                  return (
                    <li key={star} className="game-detail__dist-row">
                      <span className="game-detail__dist-label">{star}★</span>
                      <span
                        className="game-detail__dist-bar"
                        role="img"
                        aria-label={`${star} estrellas: ${total} ${total === 1 ? 'reseña' : 'reseñas'}`}
                      >
                        <span className="game-detail__dist-fill" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="game-detail__dist-total">{total}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <BugReportForm
              gameId={id}
              builds={builds}
              buildId={feedbackBuildId}
              onBuildChange={setFeedbackBuildId}
              loginHref={`/login?redirect=${encodeURIComponent(pathname)}`}
            />
          </div>

          {/* ── Columna derecha: reseñas ── */}
          <section className="game-detail__reviews" aria-labelledby="gd-reviews-title">
            <h2 id="gd-reviews-title" className="game-detail__reviews-title">
              Reseñas
              {count > 0 && (
                <span className="game-detail__reviews-count">{count}</span>
              )}
            </h2>

            <ReviewForm
              gameId={id}
              builds={builds}
              buildId={feedbackBuildId}
              onBuildChange={setFeedbackBuildId}
              loginHref={`/login?redirect=${encodeURIComponent(pathname)}`}
              onReviewPosted={handleReviewPosted}
            />
            <ReviewList reviews={reviews} />
          </section>

        </div>
      </div>
    </main>
  )
}

export default GameDetail
