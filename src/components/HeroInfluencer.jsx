// Hero de la portada con el video vertical (9:16) de un influencer.
// Presentacional: la página le pasa el juego, los medios y los conteos.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../utils/track'
import '../styles/heroInfluencer.css'

const COMPLETE_AT = 0.9 // hero_video_complete se dispara al 90%

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function formatCount(n) {
  return new Intl.NumberFormat('es-MX').format(n)
}

function HeroInfluencer({
  videoSrc,
  posterSrc,
  captionsSrc,
  influencerHandle,
  influencerName,
  gameId,
  gameTitle,
  duration,
  reviewHref,
  developerHref = '/login?role=developer',
  stats = null,          // { betaGames, reviews } o null si no hay datos
  statsLoading = false,
}) {
  const videoRef = useRef(null)
  const trackRef = useRef(null)
  const completedRef = useRef(false)
  const [reducedMotion] = useState(prefersReducedMotion)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [caption, setCaption] = useState('')
  const [failed, setFailed] = useState(!videoSrc)

  const handle = influencerHandle.replace(/^@/, '')
  const videoLabel = `${influencerName} prueba ${gameTitle} en beta`

  // Autoplay silenciado salvo con prefers-reduced-motion. Se fuerza `muted`
  // como propiedad porque los navegadores solo permiten autoplay sin sonido.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    if (reducedMotion) video.pause()
    else video.play().catch(() => { /* el navegador bloqueó el autoplay: queda el poster */ })
  }, [reducedMotion, videoSrc])

  // Subtítulos: el <track> carga los cues y aquí se pintan con el estilo del
  // mockup (encima de los controles). Sin JS, el navegador los muestra nativos;
  // con JS se ocultan en onLoadedMetadata para no duplicarlos.
  useEffect(() => {
    const trackEl = trackRef.current
    if (!trackEl) return
    const onCueChange = () => setCaption(trackEl.track.activeCues?.[0]?.text ?? '')
    trackEl.addEventListener('cuechange', onCueChange)
    return () => trackEl.removeEventListener('cuechange', onCueChange)
  }, [captionsSrc, failed])

  function hideNativeCaptions(e) {
    const track = e.currentTarget.textTracks[0]
    if (track) track.mode = 'hidden'
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => setFailed(true))
      trackEvent('hero_video_play', { game_id: gameId, influencer: handle })
    } else {
      video.pause()
    }
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    if (!video.muted) {
      trackEvent('hero_video_unmute', { game_id: gameId, influencer: handle })
    }
  }

  function handleTimeUpdate(e) {
    const { currentTime, duration: total } = e.currentTarget
    if (!total) return
    const ratio = currentTime / total
    setProgress(ratio)
    if (ratio >= COMPLETE_AT && !completedRef.current) {
      completedRef.current = true
      trackEvent('hero_video_complete', { game_id: gameId, influencer: handle })
    }
  }

  const isExternalReview = /^https?:\/\//.test(reviewHref ?? '')

  return (
    <section className="hero-inf" aria-labelledby="hero-inf-title">
      <div className="hero-inf__inner">

        {/* ── Texto ── */}
        <div className="hero-inf__intro">
          <span className="hero-inf__badge">Juegos indie en beta</span>
          <h1 id="hero-inf-title" className="hero-inf__title">
            Juega antes que nadie.<br />
            <span className="hero-inf__title-accent">Opina y cambia el juego.</span>
          </h1>
          <p className="hero-inf__lead">
            Prueba juegos indie antes de su lanzamiento, califícalos
            <span className="hero-inf__desktop-only"> de 1 a 5 estrellas</span> y
            reporta bugs<span className="hero-inf__desktop-only"> directo a sus desarrolladores</span>.
            Tu primera reseña no necesita cuenta.
          </p>
        </div>

        {/* ── Video ── */}
        <figure className="hero-inf__media">
          <div className="hero-inf__frame">
            {failed ? (
              posterSrc && <img className="hero-inf__video" src={posterSrc} alt={videoLabel} />
            ) : (
              <video
                ref={videoRef}
                className="hero-inf__video"
                src={videoSrc}
                poster={posterSrc}
                autoPlay={!reducedMotion}
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={`Video: ${videoLabel}`}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={hideNativeCaptions}
                onError={() => setFailed(true)}
              >
                {captionsSrc && (
                  <track ref={trackRef} kind="captions" src={captionsSrc} srcLang="es" label="Español" default />
                )}
              </video>
            )}

            <div className="hero-inf__shade" aria-hidden="true" />

            <div className="hero-inf__top">
              <span className="hero-inf__handle">
                <span className="hero-inf__avatar" aria-hidden="true">
                  {handle.charAt(0).toUpperCase()}
                </span>
                @{handle}
              </span>
              <span className="hero-inf__collab">Colaboración</span>
            </div>

            {!failed && caption && (
              <p className="hero-inf__caption" aria-hidden="true">{caption}</p>
            )}

            {!failed && (
              <div className="hero-inf__controls">
                <button
                  type="button"
                  className="hero-inf__play"
                  onClick={togglePlay}
                  aria-label={playing ? 'Pausar video' : 'Reproducir video'}
                >
                  {playing ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 5v14M17 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 4l13 8-13 8z" fill="currentColor" />
                    </svg>
                  )}
                </button>

                <div
                  className="hero-inf__progress"
                  role="progressbar"
                  aria-label="Progreso del video"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <div className="hero-inf__progress-bar" style={{ width: `${progress * 100}%` }} />
                </div>

                <button
                  type="button"
                  className="hero-inf__mute"
                  onClick={toggleMute}
                  aria-label={muted ? 'Activar sonido del video' : 'Silenciar video'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 9h4l5-4v14l-5-4H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    {muted ? (
                      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    ) : (
                      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    )}
                  </svg>
                  <span className="hero-inf__mute-text" aria-hidden="true">
                    {muted ? 'Activar sonido' : 'Silenciar'}
                  </span>
                </button>
              </div>
            )}
          </div>

          <figcaption className="hero-inf__figcaption">
            <span>{influencerName} prueba {gameTitle} en beta · {duration}</span>
            {reviewHref && (isExternalReview ? (
              <a href={reviewHref} target="_blank" rel="noopener noreferrer">Ver su reseña</a>
            ) : (
              <Link to={reviewHref}>Ver su reseña</Link>
            ))}
          </figcaption>
        </figure>

        {/* ── CTAs ── */}
        <div className="hero-inf__ctas">
          <Link
            to={`/juego/${gameId}`}
            className="hero-inf__cta hero-inf__cta--primary"
            onClick={() => trackEvent('hero_cta_click', { cta: 'jugar', game_id: gameId })}
          >
            Probar el juego del video
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            to={developerHref}
            className="hero-inf__cta hero-inf__cta--ghost"
            onClick={() => trackEvent('hero_cta_click', { cta: 'desarrollador' })}
          >
            {/* Un solo hijo de texto: el gap del flex separaría el span */}
            <span>Soy desarrollador<span className="hero-inf__desktop-only">: subir mi juego</span></span>
          </Link>
        </div>

        {/* ── Datos ── */}
        <dl className="hero-inf__stats" aria-busy={statsLoading}>
          <div className="hero-inf__stat">
            <dt>juegos en beta</dt>
            <dd>{statsLoading
              ? <span className="hero-inf__stat-skeleton"><span className="hero-inf__sr">Cargando</span></span>
              : stats ? formatCount(stats.betaGames) : '—'}</dd>
          </div>
          <div className="hero-inf__stat">
            <dt>reseñas de la comunidad</dt>
            <dd>{statsLoading
              ? <span className="hero-inf__stat-skeleton"><span className="hero-inf__sr">Cargando</span></span>
              : stats ? formatCount(stats.reviews) : '—'}</dd>
          </div>
          <div className="hero-inf__stat">
            <dt>calificación por juego</dt>
            <dd>1–5 ★</dd>
          </div>
        </dl>

      </div>
    </section>
  )
}

export default HeroInfluencer
