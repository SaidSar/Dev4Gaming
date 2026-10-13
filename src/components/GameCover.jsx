// Portada de un juego (cover_url) con respaldo en degradado si falta o falla
import { useState } from 'react'
import '../styles/gameCover.css'

function GameCover({ src, title, genre, className = '', children }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = Boolean(src) && failedSrc !== src
  const alt = `Portada de ${title}${genre ? `, juego de ${genre}` : ''}`

  return (
    <div className={`game-cover ${className}`}>
      {showImage ? (
        <img
          className="game-cover__img"
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <div className="game-cover__fallback" role="img" aria-label={alt}>
          <span className="game-cover__fallback-title">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}

export default GameCover
