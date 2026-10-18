// "Mis juegos" del panel: portada, versiones, plataformas y estado.
import GameCover from './GameCover'
import { PLATFORM_LABEL, PLATFORM_ORDER } from '../utils/builds'

function summarize(builds = []) {
  const versions = new Set(builds.map(b => b.version))
  const published = new Set(builds.filter(b => b.status === 'published').map(b => b.version))
  const platforms = PLATFORM_ORDER.filter(p => builds.some(b => b.platform === p && b.status !== 'archived'))
  return { versions: versions.size, published: published.size, platforms }
}

function DevGameList({ games, onOpen, onCreate }) {
  return (
    <div className="dev-games">
      <button type="button" className="dev-games__new" onClick={onCreate}>
        <span className="dev-games__new-plus" aria-hidden="true">+</span>
        Crear juego
      </button>

      {games.map(game => {
        const s = summarize(game.builds)
        return (
          <article key={game.id} className="dev-game card">
            <GameCover src={game.cover_url} title={game.title} genre={game.genre} className="dev-game__cover" />
            <div className="dev-game__body">
              <h3 className="dev-game__title">{game.title}</h3>
              <span className={`dev-game__status ${game.is_listed ? 'dev-game__status--listed' : ''}`}>
                {game.is_listed ? 'Visible en el catálogo' : 'Oculto: publica una versión'}
              </span>
              <dl className="dev-game__facts">
                <div><dt>Versiones</dt><dd>{s.versions} <small>({s.published} publicadas)</small></dd></div>
                <div>
                  <dt>Plataformas</dt>
                  <dd>{s.platforms.length ? s.platforms.map(p => PLATFORM_LABEL[p]).join(' · ') : '—'}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-primary dev-game__open" onClick={() => onOpen(game.id)}>
                Abrir
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default DevGameList
