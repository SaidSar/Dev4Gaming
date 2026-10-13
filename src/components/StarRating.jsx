// Estrellas de solo lectura (★ llenas / ☆ vacías) para un promedio 0–5
import '../styles/starRating.css'

function StarRating({ value = 0, size = 'md' }) {
  const filled = Math.round(value)

  return (
    <span
      className={`star-rating star-rating--${size}`}
      role="img"
      aria-label={`Calificación ${value.toFixed(1)} de 5`}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`star-rating__star ${n <= filled ? 'star-rating__star--on' : ''}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </span>
  )
}

export default StarRating
