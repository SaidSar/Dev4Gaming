// Reporte de bug ligado a la versión: severidad, descripción, pasos,
// dispositivo autodetectado y captura opcional. Requiere sesión.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { submitBugReport, uploadBugScreenshot } from '../services/supabase'
import { useAuth } from '../context/useAuth'
import { getDeviceInfo, describeDevice } from '../utils/feedback'
import BuildSelect from './BuildSelect'
import '../styles/reviewForm.css'
import '../styles/bugReportForm.css'

const SEVERITIES = [
  { value: 'low',    label: 'Baja',  hint: 'Detalle visual o menor' },
  { value: 'medium', label: 'Media', hint: 'Molesta, pero se puede seguir' },
  { value: 'high',   label: 'Alta',  hint: 'Impide avanzar o rompe algo importante' },
  { value: 'crash',  label: 'Crash', hint: 'El juego se cierra o se congela' },
]

const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const SCREENSHOT_MAX = 5 * 1024 * 1024 // igual que el bucket bug-screenshots

const EMPTY = { severity: 'medium', description: '', steps: '' }

function BugReportForm({ gameId, builds = [], buildId = '', onBuildChange, loginHref }) {
  const { user } = useAuth()
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [file, setFile]       = useState(null)
  const [device, setDevice]   = useState(null)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)
  const [sent, setSent]       = useState(false)

  // Autodetecta el dispositivo al abrir el formulario
  useEffect(() => {
    if (!open || device) return
    let active = true
    getDeviceInfo().then(info => { if (active) setDevice(info) })
    return () => { active = false }
  }, [open, device])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  function handleFile(e) {
    const picked = e.target.files?.[0] ?? null
    setError(null)
    if (picked && !SCREENSHOT_TYPES.includes(picked.type)) {
      setError('La captura debe ser PNG, JPG o WebP.')
      e.target.value = ''
      return
    }
    if (picked && picked.size > SCREENSHOT_MAX) {
      setError('La captura pesa más de 5 MB. Recórtala o comprímela.')
      e.target.value = ''
      return
    }
    setFile(picked)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) {
      setError('Describe qué pasó.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const screenshot_path = file ? await uploadBugScreenshot(gameId, user.id, file) : null
      await submitBugReport({
        game_id:            gameId,
        build_id:           buildId || null,
        severity:           form.severity,
        description:        form.description.trim(),
        steps_to_reproduce: form.steps.trim() || null,
        device_info:        device,
        screenshot_path,
      })
      setSent(true)
      setForm(EMPTY)
      setFile(null)
    } catch {
      setError('No se pudo enviar el reporte. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bug-report card" aria-labelledby="bug-report-title" data-no-signup-invite>
      <div className="bug-report__header">
        <h2 id="bug-report-title" className="game-detail__section-title bug-report__title">
          Reportar un bug
        </h2>
        {!open && (
          <button type="button" className="btn btn-secondary" onClick={() => { setOpen(true); setSent(false) }}>
            Reportar
          </button>
        )}
      </div>
      <p className="bug-report__intro">
        Cuéntale al equipo qué falló y en qué versión. Así lo pueden corregir en la siguiente.
      </p>

      {sent && (
        <div className="review-form__success" role="status">
          <p>✓ Reporte enviado. ¡Gracias por ayudar a mejorar el juego!</p>
        </div>
      )}

      {open && !user && (
        <div className="review-form__locked">
          <p>Inicia sesión para reportar bugs: así el equipo puede avisarte cuando lo corrija.</p>
          <Link to={loginHref} className="btn btn-secondary review-form__signup">Iniciar sesión</Link>
        </div>
      )}

      {open && user && (
        <form className="review-form__body" onSubmit={handleSubmit} noValidate>
          <BuildSelect id="bug-build" builds={builds} value={buildId} onChange={onBuildChange} />

          <fieldset className="bug-report__severity">
            <legend>Severidad</legend>
            {SEVERITIES.map(s => (
              <label key={s.value} className={`bug-report__sev bug-report__sev--${s.value}`}>
                <input
                  type="radio"
                  name="severity"
                  value={s.value}
                  checked={form.severity === s.value}
                  onChange={set('severity')}
                />
                <span className="bug-report__sev-label">{s.label}</span>
                <span className="bug-report__sev-hint">{s.hint}</span>
              </label>
            ))}
          </fieldset>

          <div className="review-form__field">
            <label htmlFor="bug-desc">¿Qué pasó?</label>
            <textarea id="bug-desc" rows={3} maxLength={2000}
              placeholder="Ej.: al pausar en el nivel 2 el personaje sigue moviéndose."
              value={form.description} onChange={set('description')} />
          </div>

          <div className="review-form__field">
            <label htmlFor="bug-steps">Pasos para reproducirlo (opcional)</label>
            <textarea id="bug-steps" rows={3} maxLength={2000}
              placeholder={'1. Entra al nivel 2\n2. Pulsa Esc\n3. …'}
              value={form.steps} onChange={set('steps')} />
          </div>

          <div className="review-form__field">
            <span className="bug-report__device-label">Dispositivo (detectado automáticamente)</span>
            <p className="bug-report__device">{describeDevice(device)}</p>
          </div>

          <div className="review-form__field">
            <label htmlFor="bug-shot">Captura de pantalla (opcional, PNG/JPG/WebP, máx. 5 MB)</label>
            <input id="bug-shot" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
          </div>

          {error && <p className="review-form__error" role="alert">{error}</p>}

          <div className="bug-report__actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar reporte'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default BugReportForm
