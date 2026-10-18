// Panel del desarrollador (/dev/dashboard): subir versiones, publicar o
// archivar y ver métricas por versión. Solo para devs verificados.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getMyGames, getBuildMetrics, createBuild, updateBuildStatus } from '../services/supabase'
import { uploadBuildFile } from '../services/buildUpload'
import { PLATFORM_LABEL, sha256Hex, safeFileName } from '../utils/builds'
import { isVerifiedDev } from '../utils/roles'
import BuildUploadForm from '../components/BuildUploadForm'
import '../styles/devDashboard.css'

const STATUS_LABEL = {
  pending_review: 'Pendiente',
  published:      'Publicada',
  archived:       'Archivada',
}

function friendlyCreateError(err) {
  if (err?.code === '23505') return 'Ya existe esa versión para esa plataforma. Usa otro número de versión.'
  if (err?.code === '42501') return 'No tienes permiso para subir builds a este juego.'
  if (err?.originalResponse?.getStatus?.() === 413 || /size|too large|exceed/i.test(err?.message ?? '')) {
    return 'El archivo supera el límite del plan de Supabase (50 MB). Usa "Enlace externo".'
  }
  return err?.message || 'No se pudo guardar la versión. Intenta de nuevo.'
}

function percent(value) {
  return value == null ? '—' : `${Math.round(value * 100)} %`
}

function DevDashboard() {
  const { user, profile, verification, loading: authLoading } = useAuth()
  const verifiedDev = isVerifiedDev(profile, verification)

  const [games, setGames]       = useState([])
  const [gameId, setGameId]     = useState('')
  const [metrics, setMetrics]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [updating, setUpdating] = useState(null)   // build_id en curso

  // Juegos del dev
  useEffect(() => {
    if (authLoading || !verifiedDev) return
    let active = true
    getMyGames(user.id)
      .then(data => {
        if (!active) return
        setGames(data)
        setGameId(data[0]?.id ?? '')
        if (!data.length) setLoading(false)
      })
      .catch(() => { if (active) { setError('No se pudieron cargar tus juegos.'); setLoading(false) } })
    return () => { active = false }
  }, [authLoading, verifiedDev, user])

  // Métricas del juego elegido. Para recargar: reloadMetrics() (evento)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    if (!gameId) return
    let active = true
    getBuildMetrics(gameId)
      .then(data => { if (active) { setMetrics(data); setError(null) } })
      .catch(() => { if (active) setError('No se pudieron cargar las métricas.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [gameId, reloadKey])

  function reloadMetrics() {
    setLoading(true)
    setReloadKey(k => k + 1)
  }

  // Hash → subida TUS (o enlace externo / web) → fila en builds
  async function handleCreate(values, { onPhase, onProgress }) {
    try {
      let sha256 = null
      let size_bytes = null
      if (values.file) {
        onPhase('hash')
        size_bytes = values.file.size
        sha256 = await sha256Hex(values.file)
      }

      let storage_provider = 'external'
      let file_path = null
      let web_entry_url = null

      if (values.platform === 'web') {
        web_entry_url = values.webUrl.trim()
      } else if (values.mode === 'upload') {
        storage_provider = 'supabase'
        file_path = `${gameId}/${values.version}/${values.platform}/${safeFileName(values.file.name)}`
        onPhase('upload')
        await uploadBuildFile({ path: file_path, file: values.file, onProgress }).promise
      } else {
        file_path = values.externalUrl.trim()
      }

      onPhase('save')
      await createBuild({
        game_id: gameId,
        version: values.version,
        platform: values.platform,
        storage_provider,
        file_path,
        web_entry_url,
        size_bytes,
        sha256,
        changelog:        values.changelog.trim() || null,
        test_focus:       values.test_focus.trim() || null,
        min_requirements: values.min_requirements.trim() || null,
        status: 'pending_review',
      })
      reloadMetrics()
    } catch (err) {
      throw new Error(friendlyCreateError(err), { cause: err })
    }
  }

  async function changeStatus(buildId, status) {
    setUpdating(buildId)
    try {
      await updateBuildStatus(buildId, status)
      reloadMetrics()
    } catch {
      setError('No se pudo cambiar el estado de la versión.')
    } finally {
      setUpdating(null)
    }
  }

  // ── Estados de acceso ──
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
        <h1 className="dev-dashboard__title">Panel del desarrollador</h1>
        {games.length > 1 && (
          <div className="dev-dashboard__game-picker">
            <label htmlFor="dd-game">Juego</label>
            <select id="dd-game" value={gameId} onChange={e => { setLoading(true); setGameId(e.target.value) }}>
              {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        )}
      </header>

      {error && <p className="dev-upload__error" role="alert">{error}</p>}

      {!loading && !games.length ? (
        <div className="dev-dashboard__empty card">
          <p>
            Aún no tienes juegos asignados. Por ahora el equipo de Dev4Gaming asigna cada
            juego a su desarrollador; escríbenos para dar de alta el tuyo.
          </p>
        </div>
      ) : (
        <div className="dev-dashboard__layout">
          {game && <BuildUploadForm key={gameId} onSubmit={handleCreate} />}

          <section className="dev-dashboard__versions" aria-labelledby="dd-versions-title">
            <h2 id="dd-versions-title" className="dev-dashboard__section-title">
              Versiones {game && <span className="dev-dashboard__game-name">· {game.title}</span>}
            </h2>

            {loading ? (
              <div className="dev-dashboard__skeleton" aria-busy="true">Cargando métricas…</div>
            ) : !metrics.length ? (
              <p className="dev-dashboard__muted">Todavía no subes versiones de este juego.</p>
            ) : (
              <ul className="dev-versions">
                {metrics.map(m => (
                  <li key={m.build_id} className="dev-version card">
                    <div className="dev-version__head">
                      <div>
                        <strong className="dev-version__name">v{m.version}</strong>
                        <span className="dev-version__platform">{PLATFORM_LABEL[m.platform]}</span>
                      </div>
                      <span className={`dev-version__status dev-version__status--${m.status}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>

                    <dl className="dev-version__metrics">
                      <div><dt>Descargas</dt><dd>{m.downloads}<small> ({m.downloaders} usuarios)</small></dd></div>
                      <div><dt>Rating</dt><dd>{m.avg_rating != null ? `${Number(m.avg_rating).toFixed(1)} ★` : '—'}<small> ({m.reviews})</small></dd></div>
                      <div><dt>Descarga → reseña</dt><dd>{percent(m.download_to_review)}</dd></div>
                      <div>
                        <dt>Bugs</dt>
                        <dd className="dev-version__bugs">
                          <span className="sev sev--crash" title="Crash">{m.bugs_crash} crash</span>
                          <span className="sev sev--high" title="Alta">{m.bugs_high} alta</span>
                          <span className="sev" title="Media">{m.bugs_medium} media</span>
                          <span className="sev" title="Baja">{m.bugs_low} baja</span>
                        </dd>
                      </div>
                    </dl>

                    <div className="dev-version__actions">
                      {m.status !== 'published' && (
                        <button type="button" className="btn btn-primary" disabled={updating === m.build_id}
                          onClick={() => changeStatus(m.build_id, 'published')}>
                          {m.status === 'archived' ? 'Volver a publicar' : 'Publicar'}
                        </button>
                      )}
                      {m.status !== 'archived' && (
                        <button type="button" className="btn btn-secondary" disabled={updating === m.build_id}
                          onClick={() => changeStatus(m.build_id, 'archived')}>
                          Archivar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="dev-dashboard__muted dev-dashboard__note">
              Antes de publicar: firma el APK con tu keystore de release y revisa el archivo en
              VirusTotal. "Descarga → reseña" solo cuenta reseñas hechas con cuenta.
            </p>
          </section>
        </div>
      )}
    </main>
  )
}

export default DevDashboard
