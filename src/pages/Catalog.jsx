import { useEffect, useState } from 'react'
import { getGames } from '../services/supabase'
import GameCard from '../components/GameCard'
import '../styles/catalog.css'

function Catalog() {
  const [games, setGames]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [activeGenre, setActiveGenre] = useState('Todos')

  useEffect(() => {
    async function fetchGames() {
      try {
        const data = await getGames()
        setGames(data)
      } catch {
        setError('No se pudo cargar el catálogo. Intenta de nuevo.')
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

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
          <p>Explora juegos indie en beta y deja tu reseña.</p>
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
            <span className="catalog__state-icon">⚠️</span>
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        )}

        {/* ── Sin resultados para el filtro ── */}
        {!loading && !error && filtered.length === 0 && (
          <div className="catalog__state">
            <span className="catalog__state-icon">🎮</span>
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
                <GameCard key={game.id} {...game} />
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  )
}

export default Catalog