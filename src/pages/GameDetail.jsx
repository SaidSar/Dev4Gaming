import { useEffect, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { getGameById, getReviewsByGame, getPublishedBuilds, getDownloadUrl } from '../services/supabase'
import { useAuth } from '../context/useAuth'
import { trackConversion } from '../utils/track'
import GameCover from '../components/GameCover'
import Icon from '../components/Icon'
import StarRating from '../components/StarRating'
import ReviewForm from '../components/ReviewForm'
import ReviewList from '../components/ReviewList'
import GameBuilds from '../components/GameBuilds'
import '../styles/gameDetail.css'

function GameDetail() {
  const { id } = useParams()
  const [game, setGame]       = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [builds, setBuilds]   = useState([])
  const { user } = useAuth()
  const { pathname } = useLocation()

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
  }

  // La Edge Function valida sesión y build, registra la descarga y firma la URL
  async function handleDownload(build) {
    const result = await getDownloadUrl(build.id)
    trackConversion('download_click', { game_id: id })
    window.location.assign(result.url)
    return result
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
              game={game}
              builds={builds}
              signedIn={Boolean(user)}
              loginHref={`/login?redirect=${encodeURIComponent(pathname)}`}
              onDownload={handleDownload}
            />

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
          </div>

          {/* ── Columna derecha: reseñas ── */}
          <section className="game-detail__reviews" aria-labelledby="gd-reviews-title">
            <h2 id="gd-reviews-title" className="game-detail__reviews-title">
              Reseñas
              {count > 0 && (
                <span className="game-detail__reviews-count">{count}</span>
              )}
            </h2>

            <ReviewForm gameId={id} onReviewPosted={handleReviewPosted} />
            <ReviewList reviews={reviews} />
          </section>

        </div>
      </div>
    </main>
  )
}

export default GameDetail
