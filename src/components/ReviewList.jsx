import '../styles/reviewForm.css'

function ReviewList({ reviews }) {
  if (!reviews.length) return (
    <div className="review-list__empty">
      <p>Aún no hay reseñas. ¡Sé el primero en opinar!</p>
    </div>
  )

  return (
    <ul className="review-list">
      {reviews.map(review => (
        <li key={review.id} className="review-item card">

          <div className="review-item__header">
            <div className="review-item__avatar">
              {review.user_name?.charAt(0).toUpperCase()}
            </div>
            <div className="review-item__meta">
              <span className="review-item__name">{review.user_name}</span>
              <span className="review-item__date">
                {new Date(review.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'short', day: 'numeric'
                })}
              </span>
            </div>
            <div className="review-item__stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`review-item__star ${i < review.rating ? 'review-item__star--on' : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <p className="review-item__comment">{review.comment}</p>

        </li>
      ))}
    </ul>
  )
}

export default ReviewList