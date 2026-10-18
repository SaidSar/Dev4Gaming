// Formulario "Subir nueva versión" del panel del dev. Valida en el cliente
// (extensión, tamaño, versión, URL web) y delega la subida a la página.
import { useState } from 'react'
import {
  PLATFORM_LABEL, PLATFORM_EXT, SUPABASE_MAX_BYTES, fileExtension, formatBytes, isAllowedWebUrl,
} from '../utils/builds'

const VERSION_RE = /^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/

const PHASE_LABEL = {
  hash:   'Calculando SHA-256…',
  upload: 'Subiendo archivo…',
  save:   'Guardando versión…',
}

const EMPTY = {
  platform: 'android', version: '', mode: 'upload', externalUrl: '', webUrl: '',
  changelog: '', test_focus: '', min_requirements: '',
}

function BuildUploadForm({ onSubmit }) {
  const [form, setForm]         = useState(EMPTY)
  const [file, setFile]         = useState(null)
  const [phase, setPhase]       = useState(null)     // null | 'hash' | 'upload' | 'save'
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState(null)
  const [done, setDone]         = useState(null)

  const isWeb = form.platform === 'web'
  const busy = phase !== null
  const allowedExt = PLATFORM_EXT[form.platform] ?? []
  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  function validateFile(picked, mode) {
    if (!picked) return mode === 'upload' ? 'Elige el archivo del build.' : null
    if (!allowedExt.includes(fileExtension(picked.name))) {
      return `Para ${PLATFORM_LABEL[form.platform]} sube un archivo .${allowedExt.join(' o .')}`
        + (form.platform !== 'android' ? ' (el .exe va dentro del .zip).' : '.')
    }
    if (mode === 'upload' && picked.size > SUPABASE_MAX_BYTES) {
      return `El archivo pesa ${formatBytes(picked.size)} y el límite de Supabase en el plan actual es de 50 MB. `
        + 'Súbelo a un proveedor externo (GitHub Releases, Cloudflare R2, itch.io) y usa "Enlace externo".'
    }
    return null
  }

  function handleFile(e) {
    const picked = e.target.files?.[0] ?? null
    setFile(picked)
    setError(validateFile(picked, form.mode))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setDone(null)

    const version = form.version.trim()
    if (!VERSION_RE.test(version)) {
      return setError('Versión inválida: usa letras, números, punto, guion o guion bajo (ej. 0.3.1-beta).')
    }
    if (isWeb && !isAllowedWebUrl(form.webUrl.trim())) {
      return setError('El build web debe ser una URL https de itch.io o github.io.')
    }
    if (!isWeb && form.mode === 'external' && !/^https:\/\//i.test(form.externalUrl.trim())) {
      return setError('El enlace externo debe empezar con https://')
    }
    if (!isWeb) {
      const fileError = validateFile(file, form.mode)
      if (fileError) return setError(fileError)
    }

    setError(null)
    setProgress(0)
    try {
      await onSubmit(
        { ...form, version, file: isWeb ? null : file },
        { onPhase: setPhase, onProgress: setProgress },
      )
      setDone(`v${version} para ${PLATFORM_LABEL[form.platform]} quedó guardada como pendiente. Publícala cuando esté lista.`)
      setForm(f => ({ ...EMPTY, platform: f.platform }))
      setFile(null)
      e.target.reset()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la versión.')
    } finally {
      setPhase(null)
    }
  }

  return (
    <form className="dev-upload card" onSubmit={handleSubmit} noValidate>
      <h2 className="dev-dashboard__section-title">Subir nueva versión</h2>

      <div className="dev-upload__grid">
        <div className="dev-upload__field">
          <label htmlFor="up-platform">Plataforma</label>
          <select id="up-platform" value={form.platform} disabled={busy}
            onChange={e => { set('platform')(e); setFile(null); setError(null) }}>
            {['android', 'windows', 'macos', 'linux', 'web'].map(p => (
              <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
            ))}
          </select>
        </div>
        <div className="dev-upload__field">
          <label htmlFor="up-version">Versión</label>
          <input id="up-version" type="text" placeholder="0.3.1-beta" maxLength={40}
            value={form.version} onChange={set('version')} disabled={busy} />
        </div>
      </div>

      {isWeb ? (
        <div className="dev-upload__field">
          <label htmlFor="up-web">URL del build web (itch.io o GitHub Pages)</label>
          <input id="up-web" type="url" placeholder="https://usuario.itch.io/mi-juego"
            value={form.webUrl} onChange={set('webUrl')} disabled={busy} />
          <span className="dev-upload__hint">
            Godot 4: exporta en un solo hilo (4.3+) para no requerir cabeceras COOP/COEP.
          </span>
        </div>
      ) : (
        <>
          <fieldset className="dev-upload__modes" disabled={busy}>
            <legend>¿Dónde vive el archivo?</legend>
            <label>
              <input type="radio" name="mode" value="upload" checked={form.mode === 'upload'}
                onChange={e => { set('mode')(e); setError(validateFile(file, 'upload')) }} />
              Subir a Dev4Gaming (máx. 50 MB)
            </label>
            <label>
              <input type="radio" name="mode" value="external" checked={form.mode === 'external'}
                onChange={e => { set('mode')(e); setError(validateFile(file, 'external')) }} />
              Enlace externo (GitHub Releases, R2…)
            </label>
          </fieldset>

          {form.mode === 'external' && (
            <div className="dev-upload__field">
              <label htmlFor="up-url">Enlace de descarga (https)</label>
              <input id="up-url" type="url" placeholder="https://github.com/usuario/juego/releases/download/…"
                value={form.externalUrl} onChange={set('externalUrl')} disabled={busy} />
            </div>
          )}

          <div className="dev-upload__field">
            <label htmlFor="up-file">
              {form.mode === 'upload'
                ? `Archivo (.${allowedExt.join(', .')})`
                : 'Archivo local (opcional: solo para calcular tamaño y SHA-256, no se sube)'}
            </label>
            <input id="up-file" type="file" accept={allowedExt.map(x => `.${x}`).join(',')}
              onChange={handleFile} disabled={busy} />
            {file && <span className="dev-upload__hint">{file.name} · {formatBytes(file.size)}</span>}
          </div>
        </>
      )}

      <div className="dev-upload__field">
        <label htmlFor="up-focus">Qué probar en esta versión</label>
        <textarea id="up-focus" rows={2} placeholder="Ej.: el nuevo salto doble del nivel 2."
          value={form.test_focus} onChange={set('test_focus')} disabled={busy} />
      </div>
      <div className="dev-upload__field">
        <label htmlFor="up-changelog">Changelog</label>
        <textarea id="up-changelog" rows={3} placeholder={'- Nuevo nivel 2\n- Arreglado el crash al pausar'}
          value={form.changelog} onChange={set('changelog')} disabled={busy} />
      </div>
      <div className="dev-upload__field">
        <label htmlFor="up-req">Requisitos mínimos (opcional)</label>
        <input id="up-req" type="text" placeholder="Android 8+, 2 GB RAM"
          value={form.min_requirements} onChange={set('min_requirements')} disabled={busy} />
      </div>

      {busy && (
        <div className="dev-upload__progress">
          <span>{PHASE_LABEL[phase]}{phase === 'upload' && ` ${Math.round(progress * 100)} %`}</span>
          <div
            className="dev-upload__bar"
            role="progressbar"
            aria-label="Progreso de la subida"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={phase === 'upload' ? Math.round(progress * 100) : undefined}
          >
            <div
              className={`dev-upload__bar-fill ${phase !== 'upload' ? 'dev-upload__bar-fill--busy' : ''}`}
              style={{ width: phase === 'upload' ? `${progress * 100}%` : '100%' }}
            />
          </div>
        </div>
      )}

      {error && <p className="dev-upload__error" role="alert">{error}</p>}
      {done && <p className="dev-upload__done" role="status">✓ {done}</p>}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Procesando…' : 'Guardar versión'}
      </button>
    </form>
  )
}

export default BuildUploadForm
