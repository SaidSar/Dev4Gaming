// Panel del desarrollador (/dev/dashboard). Solo para devs verificados.
// Vistas (en la URL, así funciona "atrás"):
//   (sin params)  → Mis juegos
//   ?nuevo=1      → Crear juego
//   ?juego=<id>   → Detalle: nueva versión multiplataforma + versiones y métricas
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  getMyGames, getBuildMetrics, createBuild, updateBuildStatus, updateVersionStatus,
  createGame, uploadGameCover,
} from '../services/supabase'
import { uploadBuildFile } from '../services/buildUpload'
import { sha256Hex, safeFileName } from '../utils/builds'
import { isVerifiedDev } from '../utils/roles'
import { trackEvent } from '../utils/track'
import GameCover from '../components/GameCover'
import DevGameList from '../components/DevGameList'
import CreateGameForm from '../components/CreateGameForm'
import VersionForm from '../components/VersionForm'
import VersionList from '../components/VersionList'
import '../styles/devDashboard.css'

function friendlyCreateError(err) {
  if (err?.code === '23505') return 'Ya existe esa versión para esa plataforma.'
  if (err?.code === '42501') return 'No tienes permiso para subir builds a este juego.'
  if (err?.originalResponse?.getStatus?.() === 413 || /size|too large|exceed/i.test(err?.message ?? '')) {
    return 'El archivo supera el límite del plan de Supabase (50 MB). Usa "Enlace externo".'
  }
  return err?.message || 'No se pudo guardar. Intenta de nuevo.'
}

function DevDashboard() {
  const { user, profile, verification, displayName, loading: authLoading } = useAuth()
  const verifiedDev = isVerifiedDev(profile, verification)
  const [params, setParams] = useSearchParams()
  const gameId = params.get('juego')
  const creating = params.get('nuevo') === '1'

  const [games, setGames]         = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [metrics, setMetrics]     = useState([])
  const [metricsLoading, setMetricsLoading] = useState(() => Boolean(params.get('juego')))
  const [error, setError]         = useState(null)
  const [busyKey, setBusyKey]     = useState(null)   // 'v:<version>' | 'b:<build_id>'
  const [gamesKey, setGamesKey]   = useState(0)
  const [metricsKey, setMetricsKey] = useState(0)

  // ── Mis juegos ──
  useEffect(() => {
    if (authLoading || !verifiedDev) return
    let active = true
    getMyGames(user.id)
      .then(data => { if (active) setGames(data) })
      .catch(() => { if (active) setError('No se pudieron cargar tus juegos.') })
      .finally(() => { if (active) setGamesLoading(false) })
    return () => { active = false }
  }, [authLoading, verifiedDev, user, gamesKey])

  // ── Métricas del juego abierto ──
  useEffect(() => {
    if (!gameId || !verifiedDev) return
    let active = true
    getBuildMetrics(gameId)
      .then(data => { if (active) { setMetrics(data); setError(null) } })
      .catch(() => { if (active) setError('No se pudieron cargar las métricas.') })
      .finally(() => { if (active) setMetricsLoading(false) })
    return () => { active = false }
  }, [gameId, verifiedDev, metricsKey])

  // Recarga tras guardar/publicar: métricas y resumen (is_listed puede cambiar)
  function reloadAll() {
    setMetricsLoading(true)
    setMetricsKey(k => k + 1)
    setGamesKey(k => k + 1)
  }

  function openGame(id) {
    setMetrics([])
    setMetricsLoading(true)
    setError(null)
    setParams({ juego: id })
  }

  // ── Crear juego: portada (opcional) → fila en games ──
  async function handleCreateGame(values, coverFile) {
    try {
      const cover_url = coverFile ? await uploadGameCover(user.id, coverFile) : null
      const game = await createGame({
        ...values,
        cover_url,
        developer_name: displayName,
        owner_id: user.id,
      })
      trackEvent('game_create', { game_id: game.id, is_academic: values.is_academic })
      setGamesKey(k => k + 1)
      openGame(game.id)
    } catch (err) {
      throw new Error(
        err?.code === '42501' ? 'Tu cuenta no tiene permiso para crear juegos.' : 'No se pudo crear el juego. Intenta de nuevo.',
        { cause: err },
      )
    }
  }

  // ── Una plataforma de una versión: hash → subida TUS / enlace / web → fila en builds ──
  async function handleCreateBuild(common, entry, { onPhase, onProgress }) {
    try {
      let sha256 = null
      let size_bytes = null
      if (entry.file) {
        onPhase('hash')
        size_bytes = entry.file.size
        sha256 = await sha256Hex(entry.file)
      }

      let storage_provider = 'external'
      let file_path = null
      let web_entry_url = null

      if (entry.platform === 'web') {
        web_entry_url = entry.webUrl.trim()
      } else if (entry.mode === 'upload') {
        storage_provider = 'supabase'
        file_path = `${gameId}/${common.version}/${entry.platform}/${safeFileName(entry.file.name)}`
        onPhase('upload')
        try {
          await uploadBuildFile({ path: file_path, file: entry.file, onProgress }).promise
        } catch (err) {
          // 409 = ya se subió en un intento anterior (falló al guardar): seguir
          if (err?.originalResponse?.getStatus?.() !== 409) throw err
        }
      } else {
        file_path = entry.externalUrl.trim()
      }

      onPhase('save')
      const created = await createBuild({
        game_id: gameId,
        version: common.version,
        platform: entry.platform,
        storage_provider,
        file_path,
        web_entry_url,
        size_bytes,
        sha256,
        changelog:        common.changelog.trim() || null,
        test_focus:       common.test_focus.trim() || null,
        min_requirements: common.min_requirements.trim() || null,
        status: 'pending_review',
      })
      trackEvent('build_upload', {
        game_id: gameId,
        build_id: created.id,
        version: created.version,
        platform: created.platform,
        storage_provider: created.storage_provider,
        size_bytes: created.size_bytes,
      })
    } catch (err) {
      throw new Error(friendlyCreateError(err), { cause: err })
    }
  }

  async function changeVersionStatus(version, status) {
    setBusyKey(`v:${version}`)
    try {
      await updateVersionStatus(gameId, version, status)
      reloadAll()
    } catch {
      setError('No se pudo cambiar el estado de la versión.')
    } finally {
      setBusyKey(null)
    }
  }

  async function changeBuildStatus(buildId, status) {
    setBusyKey(`b:${buildId}`)
    try {
      await updateBuildStatus(buildId, status)
      reloadAll()
    } catch {
      setError('No se pudo cambiar el estado de la plataforma.')
    } finally {
      setBusyKey(null)
    }
  }

  // ── Acceso ──
  if (authLoading) return <div className="container auth-loading">Cargando...</div>

  if (!verifiedDev) {
    return (
      <main className="dev-dashboard container fade-in">
        <h1 className="dev-dashboard__title">Panel del desarrollador</h1>
        <div className="dev-dashboard__empty card">
          <p>El panel es para desarrolladores verificados.</p>
          <Link to={verification ? '/profile' : '/developer/verify'} className="btn btn-primary">
            {verification ? 'Ver el estado de mi solicitud' : 'Solicitar verificación'}
          </Link>
        </div>
      </main>
    )
  }

  const game = games.find(g => g.id === gameId)

  return (
    <main className="dev-dashboard container fade-in">
      <header className="dev-dashboard__header">
        <div>
          {(gameId || creating) && (
            <button type="button" className="dev-link-btn dev-dashboard__back" onClick={() => setParams({})}>
              ← Mis juegos
            </button>
          )}
          <h1 className="dev-dashboard__title">
            {creating ? 'Crear juego' : game ? game.title : 'Mis juegos'}
          </h1>
        </div>
      </header>

      {error && <p className="dev-upload__error" role="alert">{error}</p>}

      {creating ? (
        <CreateGameForm onSubmit={handleCreateGame} onCancel={() => setParams({})} />
      ) : gameId ? (
        gamesLoading ? (
          <div className="dev-dashboard__skeleton" aria-busy="true">Cargando juego…</div>
        ) : !game ? (
          <div className="dev-dashboard__empty card">
            <p>Ese juego no existe o no es tuyo.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setParams({})}>Volver a mis juegos</button>
          </div>
        ) : (
          <>
            <section className="dev-game-detail card">
              <GameCover src={game.cover_url} title={game.title} genre={game.genre} className="dev-game-detail__cover" />
              <div className="dev-game-detail__info">
                <span className={`dev-game__status ${game.is_listed ? 'dev-game__status--listed' : ''}`}>
                  {game.is_listed ? 'Visible en el catálogo' : 'Oculto del catálogo hasta publicar una versión'}
                </span>
                <Link to={`/juego/${game.id}`} className="dev-link-btn">Ver ficha pública →</Link>
              </div>
            </section>

            <div className="dev-dashboard__layout">
              <VersionForm
                key={game.id}
                existingVersions={[...new Set(metrics.map(m => m.version))]}
                onCreateBuild={handleCreateBuild}
                onFinished={reloadAll}
              />
              <section className="dev-dashboard__versions" aria-labelledby="dd-versions-title">
                <h2 id="dd-versions-title" className="dev-dashboard__section-title">Versiones</h2>
                {metricsLoading && !metrics.length ? (
                  <div className="dev-dashboard__skeleton" aria-busy="true">Cargando métricas…</div>
                ) : (
                  <VersionList
                    metrics={metrics}
                    busyKey={busyKey}
                    onVersionStatus={changeVersionStatus}
                    onBuildStatus={changeBuildStatus}
                  />
                )}
                <p className="dev-dashboard__muted dev-dashboard__note">
                  Antes de publicar: firma el APK con tu keystore de release y revisa el archivo en
                  VirusTotal. "Descarga → reseña" solo cuenta reseñas hechas con cuenta.
                </p>
              </section>
            </div>
          </>
        )
      ) : gamesLoading ? (
        <div className="dev-dashboard__skeleton" aria-busy="true">Cargando tus juegos…</div>
      ) : (
        <>
          {!games.length && (
            <p className="dev-dashboard__muted dev-dashboard__intro">
              Aún no tienes juegos. Crea el primero y después sube su primera versión.
            </p>
          )}
          <DevGameList
            games={games}
            onOpen={openGame}
            onCreate={() => setParams({ nuevo: '1' })}
          />
        </>
      )}
    </main>
  )
}

export default DevDashboard
