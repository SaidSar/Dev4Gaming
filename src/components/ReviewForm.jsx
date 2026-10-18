import { useState } from 'react'
import { Link } from 'react-router-dom'
import { postReview } from '../services/supabase'
import { useAuth } from '../context/useAuth'
import { getUtm } from '../utils/utm'
import { trackConversion, trackEvent } from '../utils/track'
import { hasAnonReview, lockAnonReview, markRated } from '../utils/feedback'
import BuildSelect from './BuildSelect'
import '../styles/reviewForm.css'

function randomAnonName() {
  return `Anonimo${Math.floor(1000 + Math.random() * 9000)}`
}

// Mensajes para los errores que devuelve la base (trigger reviews_before_insert)
function reviewError(err) {
  if (err?.code === 'P0429') return 'Alcanzaste el límite de reseñas anónimas de hoy. Inicia sesión para seguir opinando.'
  if (err?.code === '23514') return 'Esa versión ya no está disponible. Elige otra o "No lo sé".'
  return 'No se pudo enviar la reseña. Intenta de nuevo.'
}

// buildId lo controla la página (lo comparte con el reporte de bugs y el
// aviso "¿Ya lo probaste?"); '' = versión no especificada.
function ReviewForm({ gameId, builds = [], buildId = '', onBuildChange, loginHref, onReviewPosted }) {
  const { user, displayName } = useAuth()
  const [userName, setUserName] = useState('')
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [comment, setComment]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState(null)
  // 1 reseña anónima por juego y sesión del navegador (además del límite por IP)
  const [anonLocked, setAnonLocked] = useState(() => hasAnonReview(gameId))

  async function handleSubmit(e) {
    e.preventDefault()

    if (!rating) {
      setError('Elige de 1 a 5 estrellas para publicar.')
      return
    }
    if (!comment.trim()) {
      setError('Escribe un comentario para publicar.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const review = await postReview({
        game_id:    gameId,
        build_id:   buildId || null,
        user_id:    user?.id ?? null,
        user_name:  user ? displayName : (userName.trim() || randomAnonName()),
        rating,
        comment:    comment.trim(),
        utm_source: getUtm().utm_source ?? null,
      })
      setSuccess(true)
      setUserName('')
      setRating(0)
      setComment('')
      markRated(buildId)
      if (!user) {
        lockAnonReview(gameId)
        setAnonLocked(true)
      }
      onReviewPosted?.(review)
      trackConversion('submit_review', { game_id: gameId, rating: review.rating })
      trackEvent('review_submit', {
        game_id: gameId,
        build_id: review.build_id,
        version: review.build?.version ?? null,
        rating: review.rating,
        anonymous: !user,
      })
    } catch (err) {
      setError(reviewError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="review-form card" id="resena" data-no-signup-invite>
      <h3 className="review-form__title">Deja tu reseña</h3>

      {success && (
        <div className="review-form__success" role="status">
          <p>✓ ¡Reseña publicada! Gracias por tu feedback.</p>
          {!user && (
            <Link to={`${loginHref}&mode=register`} className="btn btn-secondary review-form__signup">
              Crear cuenta para guardar mis reseñas
            </Link>
          )}
        </div>
      )}

      {!user && anonLocked && !success ? (
        <div className="review-form__locked">
          <p>Ya dejaste una reseña anónima de este juego en esta sesión.</p>
          <Link to={`${loginHref}&mode=register`} className="btn btn-secondary review-form__signup">
            Crea tu cuenta para opinar de nuevo
          </Link>
        </div>
      ) : !user && anonLocked ? null : (
      <form onSubmit={handleSubmit} className="review-form__body" noValidate>

        {user ? (
          <p className="review-form__as">
            Publicarás como <strong>{displayName}</strong>
          </p>
        ) : (
          <div className="review-form__field">
            <label htmlFor="rf-name">Tu nombre (opcional)</label>
            <input
              id="rf-name"
              type="text"
              placeholder="Déjalo vacío para publicar como anónimo"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              maxLength={50}
            />
          </div>
        )}

        <BuildSelect id="rf-build" builds={builds} value={buildId} onChange={onBuildChange} />

        <div className="review-form__field">
          <label>Calificación</label>
          <div className="review-form__stars">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className={`review-form__star ${star <= (hovered || rating) ? 'review-form__star--active' : ''}`}
                onClick={() => { setRating(star); setError(null) }}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                aria-pressed={star === rating}
              >
                ★
              </button>
            ))}
            {rating > 0 && (
              <span className="review-form__rating-label">{rating} / 5</span>
            )}
          </div>
        </div>

        <div className="review-form__field">
          <label htmlFor="rf-comment">Comentario</label>
          <textarea
            id="rf-comment"
            rows={4}
            placeholder="¿Qué te pareció? Para fallos usa «Reportar un bug»."
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
          />
          <span className="review-form__char-count">{comment.length} / 500</span>
        </div>

        {error && <p className="review-form__error">{error}</p>}

        <button
          type="submit"
          className="btn btn-purple"
          disabled={loading}
        >
          {loading ? 'Enviando...' : 'Publicar reseña'}
        </button>

      </form>
      )}
    </div>
  )
}

export default ReviewForm