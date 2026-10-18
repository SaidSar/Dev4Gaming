// Recuadro de descarga de la ficha: plataforma, versión, descarga o juego en
// el navegador, SHA-256, "Qué probar", changelog e instrucciones.
// Sin builds publicados muestra "Build próximamente" con los datos del juego.
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { trackEvent } from '../utils/track'
import {
  PLATFORM_LABEL, PLATFORM_ORDER, formatBytes, detectPlatform, isAllowedWebUrl,
} from '../utils/builds'
import '../styles/gameBuilds.css'

const INSTALL_STEPS = {
  android: [
    'Descarga el archivo .apk en tu teléfono.',
    'Ábrelo. Si Android lo bloquea, ve a Ajustes → Seguridad → "Instalar apps desconocidas" y permite tu navegador.',
    'Instala y abre el juego. Puedes revocar el permiso después.',
  ],
  windows: [
    'Descarga el .zip y descomprímelo (clic derecho → Extraer todo).',
    'Abre el .exe. Si aparece SmartScreen ("Windows protegió su PC"), elige "Más información" → "Ejecutar de todas formas".',
    'Compara el SHA-256 de arriba si quieres confirmar que el archivo no fue alterado.',
  ],
  macos: [
    'Descarga el .zip y ábrelo para descomprimir la app.',
    'La primera vez, haz clic derecho en la app → "Abrir" (Gatekeeper bloquea apps sin firma de Apple).',
  ],
  linux: [
    'Descarga y descomprime el .zip.',
    'Da permisos de ejecución: chmod +x ./nombre-del-juego',
    'Ejecuta ./nombre-del-juego desde la terminal.',
  ],
  web: [
    'Pulsa "Jugar en el navegador". No necesitas instalar nada.',
    'Usa pantalla completa para una mejor experiencia; con Esc sales de ella.',
  ],
}

function pickInitialPlatform(platforms) {
  const detected = detectPlatform()
  if (detected && platforms.includes(detected)) return detected
  if (platforms.includes('web')) return 'web'
  return platforms[0]
}

function GameBuilds({ game, builds, initialBuildId, signedIn, loginHref, onDownload }) {
  const platforms = PLATFORM_ORDER.filter(p => builds.some(b => b.platform === p))
  // Deep link ?build= manda; si no, la plataforma del visitante
  const linked = builds.find(b => b.id === initialBuildId)
  const [platform, setPlatform] = useState(() => linked?.platform ?? pickInitialPlatform(platforms))
  const versions = builds.filter(b => b.platform === platform)
  const [buildId, setBuildId] = useState(() => linked?.id ?? versions[0]?.id)
  const build = versions.find(b => b.id === buildId) ?? versions[0]

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)   // { type: 'ok'|'error', text }
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const frameRef = useRef(null)

  // ── Sin builds: los juegos de ejemplo siguen viéndose como antes ──
  if (!build) {
    return (
      <section className="game-detail__download card" aria-labelledby="gd-download-title">
        <h2 id="gd-download-title" className="game-detail__section-title">Descarga</h2>
        <ul className="game-detail__pills">
          <li className="game-detail__pill game-detail__pill--free">Demo gratuita</li>
          <li className="game-detail__pill">{game.platform || 'Windows'}</li>
          <li className="game-detail__pill">{game.download_size || 'Tamaño por confirmar'}</li>
          <li className="game-detail__pill">{game.version || 'Beta'}</li>
        </ul>
        <button type="button" className="btn btn-secondary game-detail__download-btn" disabled>
          Build próximamente
        </button>
        <p className="builds__note">El equipo aún no publica una versión para probar.</p>
      </section>
    )
  }

  const isWeb = build.platform === 'web'
  const webUrlOk = isWeb && isAllowedWebUrl(build.web_entry_url)

  function selectPlatform(p) {
    setPlatform(p)
    setBuildId(builds.find(b => b.platform === p)?.id)
    setPlaying(false)
    setMessage(null)
  }

  function selectVersion(id) {
    setBuildId(id)
    setPlaying(false)
    setMessage(null)
  }

  async function handleDownload() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await onDownload(build)
      setMessage({
        type: 'ok',
        text: 'Tu descarga comenzó. El enlace vence en 5 minutos.',
        sha256: result?.sha256,
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err?.status === 401
          ? 'Tu sesión expiró. Inicia sesión otra vez para descargar.'
          : 'No se pudo preparar la descarga. Intenta de nuevo en un momento.',
      })
    } finally {
      setBusy(false)
    }
  }

  async function copySha() {
    try {
      await navigator.clipboard.writeText(build.sha256)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sin permiso de portapapeles: el hash sigue visible para copiarlo a mano */
    }
  }

  function goFullscreen() {
    frameRef.current?.requestFullscreen?.().catch(() => {})
  }

  const size = formatBytes(build.size_bytes)

  return (
    <section className="game-detail__download card builds" aria-labelledby="gd-download-title">
      <h2 id="gd-download-title" className="game-detail__section-title">Descarga y prueba</h2>

      {/* ── Plataforma y versión ── */}
      {platforms.length > 1 && (
        <div className="builds__platforms" role="group" aria-label="Plataforma">
          {platforms.map(p => (
            <button
              key={p}
              type="button"
              className={`builds__platform ${p === platform ? 'builds__platform--active' : ''}`}
              aria-pressed={p === platform}
              onClick={() => selectPlatform(p)}
            >
              {PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
      )}

      <div className="builds__version-row">
        <label htmlFor="builds-version" className="builds__label">Versión</label>
        <select
          id="builds-version"
          className="builds__select"
          value={build.id}
          onChange={e => selectVersion(e.target.value)}
        >
          {versions.map((b, i) => (
            <option key={b.id} value={b.id}>
              {b.version}{i === 0 ? ' (más reciente)' : ''}
            </option>
          ))}
        </select>
      </div>

      <ul className="game-detail__pills">
        <li className="game-detail__pill game-detail__pill--free">Demo gratuita</li>
        <li className="game-detail__pill">{PLATFORM_LABEL[build.platform]}</li>
        {size && <li className="game-detail__pill">{size}</li>}
        <li className="game-detail__pill">v{build.version}</li>
      </ul>

      {/* ── Acción principal ── */}
      {isWeb ? (
        webUrlOk ? (
          !playing && (
            <button
              type="button"
              className="btn btn-primary game-detail__download-btn"
              onClick={() => {
                setPlaying(true)
                trackEvent('web_play_start', { game_id: game.id, build_id: build.id, version: build.version })
              }}
            >
              <Icon name="play" size={16} />
              Jugar en el navegador
            </button>
          )
        ) : (
          <p className="builds__msg builds__msg--error" role="alert">
            Este build web no está disponible por ahora.
          </p>
        )
      ) : signedIn ? (
        <button
          type="button"
          className="btn btn-primary game-detail__download-btn"
          onClick={handleDownload}
          disabled={busy}
        >
          <Icon name="download" size={18} />
          {busy ? 'Preparando descarga…' : `Descargar para ${PLATFORM_LABEL[build.platform]}`}
        </button>
      ) : (
        <Link to={loginHref} className="btn btn-primary game-detail__download-btn">
          <Icon name="download" size={18} />
          Inicia sesión para descargar
        </Link>
      )}

      {playing && webUrlOk && (
        <div className="builds__player">
          <div className="builds__frame">
            <iframe
              ref={frameRef}
              src={build.web_entry_url}
              title={`${game.title} v${build.version} — jugar en el navegador`}
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
              allow="fullscreen; gamepad"
              allowFullScreen
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
          <div className="builds__player-actions">
            <button type="button" className="btn btn-secondary" onClick={goFullscreen}>
              Pantalla completa
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setPlaying(false)}>
              Cerrar juego
            </button>
          </div>
        </div>
      )}

      <div role="status" className="builds__status">
        {message && (
          <p className={`builds__msg builds__msg--${message.type}`}>
            {message.text}
            {message.sha256 && <> Verifica el SHA-256 de abajo.</>}
          </p>
        )}
      </div>

      {/* ── Detalles ── */}
      {build.test_focus && (
        <div className="builds__focus">
          <h3 className="builds__heading">Qué probar en esta versión</h3>
          <p className="builds__text">{build.test_focus}</p>
        </div>
      )}

      {build.changelog && (
        <div className="builds__block">
          <h3 className="builds__heading">Cambios en v{build.version}</h3>
          <p className="builds__text">{build.changelog}</p>
        </div>
      )}

      {build.min_requirements && (
        <div className="builds__block">
          <h3 className="builds__heading">Requisitos mínimos</h3>
          <p className="builds__text">{build.min_requirements}</p>
        </div>
      )}

      {build.sha256 && (
        <div className="builds__block">
          <h3 className="builds__heading">SHA-256</h3>
          <div className="builds__hash">
            <code>{build.sha256}</code>
            <button
              type="button"
              className="builds__copy"
              onClick={copySha}
              aria-label="Copiar SHA-256"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      <details className="builds__install">
        <summary>Cómo instalar en {PLATFORM_LABEL[build.platform]}</summary>
        <ol>
          {INSTALL_STEPS[build.platform].map(step => <li key={step}>{step}</li>)}
        </ol>
      </details>
    </section>
  )
}

export default GameBuilds
