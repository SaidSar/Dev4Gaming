// "Nueva versión" multiplataforma: versión, changelog, "Qué probar" y
// requisitos se escriben una vez; cada plataforma agregada genera su fila
// en `builds` con su propia barra de progreso. Si una falla, las demás se
// guardan y esa se puede reintentar.
import { useState } from 'react'
import {
  PLATFORM_LABEL, PLATFORM_EXT, SUPABASE_MAX_BYTES, fileExtension, formatBytes, isAllowedWebUrl,
} from '../utils/builds'

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/
const PLATFORMS = ['android', 'windows', 'macos', 'linux', 'web']

const PHASE_LABEL = {
  hash:   'Calculando SHA-256…',
  upload: 'Subiendo…',
  save:   'Guardando…',
  done:   'Guardada ✓',
  error:  'Error',
}

const EMPTY_COMMON = { version: '', changelog: '', test_focus: '', min_requirements: '' }

let nextKey = 0
function newEntry(platform) {
  nextKey += 1
  return { key: nextKey, platform, mode: 'upload', file: null, externalUrl: '', webUrl: '', phase: null, progress: 0, error: null }
}

/** Error de validación de una plataforma (null si está bien) */
function validateEntry(e) {
  if (e.platform === 'web') {
    return isAllowedWebUrl(e.webUrl.trim()) ? null : 'Web: usa una URL https de itch.io o github.io.'
  }
  const label = PLATFORM_LABEL[e.platform]
  const ext = PLATFORM_EXT[e.platform]
  if (e.mode === 'external' && !/^https:\/\//i.test(e.externalUrl.trim())) {
    return `${label}: el enlace externo debe empezar con https://`
  }
  if (!e.file) return e.mode === 'upload' ? `${label}: elige el archivo .${ext.join(', .')}` : null
  if (!ext.includes(fileExtension(e.file.name))) {
    return `${label}: el archivo debe ser .${ext.join(' o .')}${e.platform !== 'android' ? ' (el .exe va dentro del .zip)' : ''}.`
  }
  if (e.mode === 'upload' && e.file.size > SUPABASE_MAX_BYTES) {
    return `${label}: pesa ${formatBytes(e.file.size)} y el límite del plan es de 50 MB. `
      + 'Súbelo a GitHub Releases, R2 o itch.io y usa "Enlace externo".'
  }
  return null
}

function VersionForm({ existingVersions = [], onCreateBuild, onFinished }) {
  const [common, setCommon]   = useState(EMPTY_COMMON)
  const [entries, setEntries] = useState(() => [newEntry('android')])
  const [running, setRunning] = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(null)

  const used = entries.map(e => e.platform)
  const available = PLATFORMS.filter(p => !used.includes(p))
  const locked = running || entries.some(e => e.phase === 'done')   // la versión ya existe en la base

  const setC = field => e => setCommon(c => ({ ...c, [field]: e.target.value }))
  const patch = (key, changes) =>
    setEntries(list => list.map(e => (e.key === key ? { ...e, ...changes } : e)))

  async function handleSubmit(e) {
    e.preventDefault()
    setDone(null)
    const version = common.version.trim()
    if (!VERSION_RE.test(version)) {
      return setError('Versión inválida: usa letras, números, punto, guion o guion bajo (ej. 0.3.1-beta).')
    }
    if (!locked && existingVersions.includes(version)) {
      return setError(`La versión ${version} ya existe. Usa otro número o publica/archiva la existente.`)
    }
    const pending = entries.filter(x => x.phase !== 'done')
    if (!pending.length) return setError('Agrega al menos una plataforma.')
    const invalid = pending.map(validateEntry).find(Boolean)
    if (invalid) return setError(invalid)

    setError(null)
    setRunning(true)
    let failed = 0
    // Una plataforma a la vez: cada una con su progreso
    for (const entry of pending) {
      patch(entry.key, { phase: 'hash', progress: 0, error: null })
      try {
        await onCreateBuild({ ...common, version }, entry, {
          onPhase: phase => patch(entry.key, { phase }),
          onProgress: progress => patch(entry.key, { progress }),
        })
        patch(entry.key, { phase: 'done', progress: 1 })
      } catch (err) {
        failed += 1
        patch(entry.key, { phase: 'error', error: err.message })
      }
    }
    setRunning(false)
    onFinished?.()

    if (failed) {
      setError(`${failed} plataforma(s) no se guardaron. Corrige y pulsa "Reintentar".`)
    } else {
      setDone(`v${version} quedó guardada como pendiente en ${pending.length} plataforma(s). Publícala cuando esté lista.`)
      setCommon(EMPTY_COMMON)
      setEntries([newEntry('android')])
    }
  }

  return (
    <form className="dev-upload card" onSubmit={handleSubmit} noValidate>
      <h2 className="dev-dashboard__section-title">Nueva versión</h2>

      <div className="dev-upload__field">
        <label htmlFor="vf-version">Versión</label>
        <input id="vf-version" type="text" placeholder="0.3.1-beta" maxLength={40}
          value={common.version} onChange={setC('version')} disabled={locked} />
      </div>
      <div className="dev-upload__field">
        <label htmlFor="vf-focus">Qué probar en esta versión</label>
        <textarea id="vf-focus" rows={2} placeholder="Ej.: el nuevo salto doble del nivel 2."
          value={common.test_focus} onChange={setC('test_focus')} disabled={locked} />
      </div>
      <div className="dev-upload__field">
        <label htmlFor="vf-changelog">Changelog</label>
        <textarea id="vf-changelog" rows={3} placeholder={'- Nuevo nivel 2\n- Arreglado el crash al pausar'}
          value={common.changelog} onChange={setC('changelog')} disabled={locked} />
      </div>
      <div className="dev-upload__field">
        <label htmlFor="vf-req">Requisitos mínimos (opcional)</label>
        <input id="vf-req" type="text" placeholder="Android 8+, 2 GB RAM · Windows 10 64-bit"
          value={common.min_requirements} onChange={setC('min_requirements')} disabled={locked} />
      </div>

      {/* ── Una fila por plataforma ── */}
      <fieldset className="dev-platforms">
        <legend>Archivos por plataforma</legend>
        {entries.map(entry => {
          const ext = PLATFORM_EXT[entry.platform] ?? []
          const busy = running && entry.phase && entry.phase !== 'done' && entry.phase !== 'error'
          const frozen = running || entry.phase === 'done'
          const idp = `vf-${entry.key}`
          return (
            <div key={entry.key} className={`dev-platform dev-platform--${entry.phase ?? 'idle'}`}>
              <div className="dev-platform__head">
                <strong>{PLATFORM_LABEL[entry.platform]}</strong>
                {entry.phase && <span className="dev-platform__phase">{PHASE_LABEL[entry.phase]}</span>}
                {!frozen && entries.length > 1 && (
                  <button type="button" className="dev-platform__remove"
                    aria-label={`Quitar ${PLATFORM_LABEL[entry.platform]}`}
                    onClick={() => setEntries(list => list.filter(x => x.key !== entry.key))}>
                    ×
                  </button>
                )}
              </div>

              {entry.platform === 'web' ? (
                <div className="dev-upload__field">
                  <label htmlFor={`${idp}-web`}>URL del build web (itch.io o GitHub Pages)</label>
                  <input id={`${idp}-web`} type="url" placeholder="https://usuario.itch.io/mi-juego"
                    value={entry.webUrl} disabled={frozen}
                    onChange={e => patch(entry.key, { webUrl: e.target.value })} />
                  <span className="dev-upload__hint">Godot 4: exporta en un solo hilo (4.3+) para no requerir COOP/COEP.</span>
                </div>
              ) : (
                <>
                  <div className="dev-platform__modes" role="radiogroup" aria-label={`Origen del archivo de ${PLATFORM_LABEL[entry.platform]}`}>
                    <label>
                      <input type="radio" name={`${idp}-mode`} checked={entry.mode === 'upload'} disabled={frozen}
                        onChange={() => patch(entry.key, { mode: 'upload' })} />
                      Subir (máx. 50 MB)
                    </label>
                    <label>
                      <input type="radio" name={`${idp}-mode`} checked={entry.mode === 'external'} disabled={frozen}
                        onChange={() => patch(entry.key, { mode: 'external' })} />
                      Enlace externo
                    </label>
                  </div>
                  {entry.mode === 'external' && (
                    <div className="dev-upload__field">
                      <label htmlFor={`${idp}-url`}>Enlace de descarga (https)</label>
                      <input id={`${idp}-url`} type="url" value={entry.externalUrl} disabled={frozen}
                        placeholder="https://github.com/usuario/juego/releases/download/…"
                        onChange={e => patch(entry.key, { externalUrl: e.target.value })} />
                    </div>
                  )}
                  <div className="dev-upload__field">
                    <label htmlFor={`${idp}-file`}>
                      {entry.mode === 'upload'
                        ? `Archivo (.${ext.join(', .')})`
                        : 'Archivo local (opcional: solo calcula tamaño y SHA-256, no se sube)'}
                    </label>
                    <input id={`${idp}-file`} type="file" accept={ext.map(x => `.${x}`).join(',')} disabled={frozen}
                      onChange={e => patch(entry.key, { file: e.target.files?.[0] ?? null, phase: null, error: null })} />
                    {entry.file && <span className="dev-upload__hint">{entry.file.name} · {formatBytes(entry.file.size)}</span>}
                  </div>
                </>
              )}

              {(busy || entry.phase === 'done') && (
                <div className="dev-upload__bar" role="progressbar"
                  aria-label={`Progreso de ${PLATFORM_LABEL[entry.platform]}`}
                  aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={entry.phase === 'upload' || entry.phase === 'done' ? Math.round(entry.progress * 100) : undefined}>
                  <div
                    className={`dev-upload__bar-fill ${entry.phase !== 'upload' && entry.phase !== 'done' ? 'dev-upload__bar-fill--busy' : ''}`}
                    style={{ width: entry.phase === 'upload' ? `${entry.progress * 100}%` : '100%' }}
                  />
                </div>
              )}
              {entry.phase === 'upload' && (
                <span className="dev-upload__hint">{Math.round(entry.progress * 100)} %</span>
              )}
              {entry.error && <p className="dev-upload__error" role="alert">{entry.error}</p>}
            </div>
          )
        })}

        {!running && available.length > 0 && (
          <div className="dev-platforms__add">
            <span>Agregar plataforma:</span>
            {available.map(p => (
              <button key={p} type="button" className="dev-platforms__add-btn"
                onClick={() => setEntries(list => [...list, newEntry(p)])}>
                + {PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {error && <p className="dev-upload__error" role="alert">{error}</p>}
      {done && <p className="dev-upload__done" role="status">✓ {done}</p>}

      <button type="submit" className="btn btn-primary" disabled={running}>
        {running ? 'Procesando…' : entries.some(e => e.phase === 'error') ? 'Reintentar' : 'Guardar versión'}
      </button>
    </form>
  )
}

export default VersionForm
