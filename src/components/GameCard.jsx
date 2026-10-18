// Card individual de un juego en el catálogo
import GameCover from './GameCover'
import Icon from './Icon'
import StarRating from './StarRating'
import '../styles/gameCard.css'

function GameCard({ game, stats, onPlay }) {
  const { title, genre, developer_name, cover_url, status, is_academic, credits } = game

  return (
    <article className="game-card card">

      <GameCover src={cover_url} title={title} genre={genre} className="game-card__cover">
        <span className="game-card__badge game-card__badge--demo">DEMO GRATIS</span>
        {status && (
          <span className={`game-card__badge game-card__badge--${status}`}>
            {status === 'beta' ? 'BETA' : 'RELEASED'}
          </span>
        )}
      </GameCover>

      <div className="game-card__body">
        {is_academic && <span className="badge-academic game-card__academic">PROYECTO ACADÉMICO</span>}
        <h3 className="game-card__title">{title}</h3>
        <p className="game-card__dev">
          {genre && <span className="game-card__genre">{genre}</span>}
          {developer_name && <span>por {developer_name}</span>}
        </p>
        {is_academic && credits && (
          <p className="game-card__credits">Créditos: {credits}</p>
        )}

        <div className="game-card__rating">
          {stats?.count ? (
            <>
              <StarRating value={stats.avg} size="sm" />
              <span className="game-card__rating-value">{stats.avg.toFixed(1)}</span>
              <span className="game-card__rating-count">
                ({stats.count} {stats.count === 1 ? 'reseña' : 'reseñas'})
              </span>
            </>
          ) : (
            <span className="game-card__rating-empty">Sin reseñas aún, sé el primero</span>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary game-card__play"
          onClick={() => onPlay(game)}
        >
          <Icon name="play" size={14} />
          Jugar
        </button>
      </div>

    </article>
  )
}

export default GameCard
