import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGames, getReviewStats } from '../services/supabase'
import { trackConversion } from '../utils/track'
import GameCard from '../components/GameCard'
import Icon from '../components/Icon'
import '../styles/catalog.css'

function Catalog() {
  const navigate = useNavigate()
  const [games, setGames]             = useState([])
  const [stats, setStats]             = useState({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [activeGenre, setActiveGenre] = useState('Todos')

  useEffect(() => {
    async function fetchGames() {
      try {
        // 2 consultas en total: juegos + todas las reseñas agregadas en cliente.
        // Si fallan las estadísticas, el catálogo se muestra igual.
        const [data, reviewStats] = await Promise.all([
          getGames(),
          getReviewStats().catch(() => ({})),
        ])
        setGames(data)
        setStats(reviewStats)
      } catch {
        setError('No se pudo cargar el catálogo. Intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  function handlePlay(game) {
    trackConversion('play_click', { game_id: game.id })
    navigate(`/juego/${game.id}`)
  }

  // Lista de géneros derivada de los juegos reales
  const genres = ['Todos', ...new Set(games.map(g => g.genre).filter(Boolean))]

  const filtered = activeGenre === 'Todos'
    ? games
    : games.filter(g => g.genre === activeGenre)

  return (
    <main className="catalog fade-in">
      <div className="container">

        {/* ── Header ── */}
        <div className="catalog__header">
          <h1>Catálogo de juegos</h1>
          <p>Prueba demos gratis de juegos indie en beta y deja tu reseña.</p>
        </div>

        {/* ── Filtros de género ── */}
        {!loading && !error && games.length > 0 && (
          <div className="catalog__filters">
            {genres.map(genre => (
              <button
                key={genre}
                className={`catalog__filter-btn ${activeGenre === genre ? 'catalog__filter-btn--active' : ''}`}
                onClick={() => setActiveGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        )}

        {/* ── Skeletons mientras carga ── */}
        {loading && (
          <div className="catalog__grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="catalog__skeleton card" />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="catalog__state">
            <Icon name="alert" size={44} className="catalog__state-icon catalog__state-icon--error" />
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}

        {/* ── Sin resultados para el filtro ── */}
        {!loading && !error && filtered.length === 0 && (
          <div className="catalog__state">
            <Icon name="gamepad" size={44} className="catalog__state-icon" />
            <p>No hay juegos en esta categoría todavía.</p>
          </div>
        )}

        {/* ── Grid de cards ── */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="catalog__count">
              {filtered.length} {filtered.length === 1 ? 'juego' : 'juegos'}
            </p>
            <div className="catalog__grid">
              {filtered.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  stats={stats[game.id]}
                  onPlay={handlePlay}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}

export default Catalog