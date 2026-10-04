import { useState } from 'react'
import { postReview } from '../services/supabase'
import { useAuth } from '../context/useAuth'
import '../styles/reviewForm.css'

function randomAnonName() {
  return `Anonimo${Math.floor(1000 + Math.random() * 9000)}`
}

function ReviewForm({ gameId, onReviewPosted }) {
  const { user, displayName } = useAuth()
  const [userName, setUserName] = useState('')
  const [rating, setRating]     = useState(0)
  const [hovered, setHovered]   = useState(0)
  const [comment, setComment]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!rating || !comment.trim()) {
      setError('Elige una calificación y escribe un comentario.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const review = await postReview({
        game_id:   gameId,
        user_id:   user?.id ?? null,
        user_name: user ? displayName : (userName.trim() || randomAnonName()),
        rating,
        comment:   comment.trim(),
      })
      setSuccess(true)
      setUserName('')
      setRating(0)
      setComment('')
      onReviewPosted?.(review)
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setError('No se pudo enviar la reseña. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="review-form card">
      <h3 className="review-form__title">Deja tu reseña</h3>

      {success && (
        <div className="review-form__success">
          ✓ ¡Reseña publicada! Gracias por tu feedback.
        </div>
      )}

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

        <div className="review-form__field">
          <label>Calificación</label>
          <div className="review-form__stars">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className={`review-form__star ${star <= (hovered || rating) ? 'review-form__star--active' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
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
          <label htmlFor="rf-comment">Comentario o reporte de bug</label>
          <textarea
            id="rf-comment"
            rows={4}
            placeholder="¿Qué te pareció el juego? ¿Encontraste algún bug?"
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
    </div>
  )
}

export default ReviewForm