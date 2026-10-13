import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGameById, getReviewsByGame } from '../services/supabase'
import { trackConversion } from '../utils/track'
import GameCover from '../components/GameCover'
import Icon from '../components/Icon'
import StarRating from '../components/StarRating'
import ReviewForm from '../components/ReviewForm'
import ReviewList from '../components/ReviewList'
import '../styles/gameDetail.css'

function GameDetail() {
  const { id } = useParams()
  const [game, setGame]       = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [downloadMsg, setDownloadMsg] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [gameData, reviewsData] = await Promise.all([
          getGameById(id),
          getReviewsByGame(id)
        ])
        setGame(gameData)
        setReviews(reviewsData)
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

  function handleDownload() {
    setDownloadMsg(true)
    trackConversion('download_click', { game_id: id })
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
            </div>

            <h1 className="game-detail__title">{game.title}</h1>
            <p className="game-detail__dev">por {game.developer_name}</p>

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

            {/* ── Descarga ── */}
            <section className="game-detail__download card" aria-labelledby="gd-download-title">
              <h2 id="gd-download-title" className="game-detail__section-title">Descarga</h2>
              <ul className="game-detail__pills">
                <li className="game-detail__pill game-detail__pill--free">Demo gratuita</li>
                <li className="game-detail__pill">{game.platform || 'Windows'}</li>
                <li className="game-detail__pill">{game.download_size || 'Tamaño por confirmar'}</li>
                <li className="game-detail__pill">{game.version || 'Beta'}</li>
              </ul>
              <button
                type="button"
                className="btn btn-primary game-detail__download-btn"
                onClick={handleDownload}
              >
                <Icon name="download" size={18} />
                Descargar juego
              </button>
              <p className="game-detail__download-msg" role="status">
                {downloadMsg ? 'La descarga estará disponible pronto.' : ''}
              </p>
            </section>

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
