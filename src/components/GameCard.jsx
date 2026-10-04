// Card individual de un juego en el catálogo
import { Link } from 'react-router-dom'
import '../styles/gameCard.css'

function GameCard({ id, title, genre, developer_name, image_url, status, rating }) {
  const stars = rating ? Number(rating).toFixed(1) : null

  return (
    <Link to={`/games/${id}`} className="game-card card">

      <div className="game-card__image">
        {image_url
          ? <img src={image_url} alt={`Portada de ${title}`} />
          : <div className="game-card__placeholder">{title?.charAt(0)}</div>
        }
        <span className={`game-card__badge game-card__badge--${status}`}>
          {status === 'beta' ? 'BETA' : 'RELEASED'}
        </span>
      </div>

      <div className="game-card__body">
        <div className="game-card__meta">
          {genre && <span className="game-card__genre">{genre}</span>}
          {stars && <span className="game-card__rating">★ {stars}</span>}
        </div>
        <h3 className="game-card__title">{title}</h3>
        <p className="game-card__dev">{developer_name}</p>
      </div>

    </Link>
  )
}

export default GameCard