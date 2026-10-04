import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGameById, getReviewsByGame } from '../services/supabase'
import ReviewForm from '../components/ReviewForm'
import ReviewList from '../components/ReviewList'
import '../styles/gameDetail.css'

function GameDetail() {
  const { id } = useParams()
  const [game, setGame]       = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

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

  // Rating promedio derivado del estado
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

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
      <p>⚠️ {error || 'Juego no encontrado.'}</p>
      <Link to="/games" className="btn btn-secondary">← Volver al catálogo</Link>
    </div>
  )

  // ── Vista principal ──────────────────────────
  return (
    <main className="game-detail fade-in">

      {/* ── Banner ── */}
      <div className="game-detail__banner">
        {game.image_url
          ? <img src={game.image_url} alt={`Banner de ${game.title}`} />
          : <div className="game-detail__banner-ph">{game.title?.charAt(0)}</div>
        }
        <div className="game-detail__banner-overlay" />
      </div>

      <div className="container">

        <Link to="/games" className="game-detail__back">← Catálogo</Link>

        {/* ── Header: título + rating ── */}
        <div className="game-detail__header">
          <div className="game-detail__header-left">
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
          </div>

          {avgRating && (
            <div className="game-detail__rating">
              <span className="game-detail__rating-value">★ {avgRating}</span>
              <span className="game-detail__rating-count">
                {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
              </span>
            </div>
          )}
        </div>

        {game.description && (
          <p className="game-detail__description">{game.description}</p>
        )}

        {/* ── Microservicio: Reseñas ── */}
        <section className="game-detail__reviews">
          <h2 className="game-detail__reviews-title">
            Reseñas
            {reviews.length > 0 && (
              <span className="game-detail__reviews-count">{reviews.length}</span>
            )}
          </h2>

          <ReviewForm gameId={id} onReviewPosted={handleReviewPosted} />
          <ReviewList reviews={reviews} />
        </section>

      </div>
    </main>
  )
}

export default GameDetail