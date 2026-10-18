// Formulario "Crear juego" del panel. Valida en el cliente y delega a la
// página la subida de la portada y el alta en `games`.
import { useEffect, useState } from 'react'

const COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const COVER_MAX = 5 * 1024 * 1024 // igual que el bucket game-covers

const EMPTY = { title: '', genre: '', description: '', credits: '', is_academic: false }

function CreateGameForm({ onSubmit, onCancel }) {
  const [form, setForm]   = useState(EMPTY)
  const [cover, setCover] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState(null)

  // Libera la URL temporal de la vista previa al cambiarla o al salir
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  function handleCover(e) {
    const picked = e.target.files?.[0] ?? null
    setError(null)
    if (picked && !COVER_TYPES.includes(picked.type)) {
      e.target.value = ''
      return setError('La portada debe ser PNG, JPG o WebP.')
    }
    if (picked && picked.size > COVER_MAX) {
      e.target.value = ''
      return setError('La portada pesa más de 5 MB.')
    }
    setCover(picked)
    setPreview(picked ? URL.createObjectURL(picked) : null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Escribe el título del juego.')
    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        title:       form.title.trim(),
        genre:       form.genre.trim() || null,
        description: form.description.trim() || null,
        credits:     form.credits.trim() || null,
        is_academic: form.is_academic,
      }, cover)
    } catch (err) {
      setError(err.message || 'No se pudo crear el juego.')
      setBusy(false)
    }
  }

  return (
    <form className="dev-upload card dev-create" onSubmit={handleSubmit} noValidate>
      <h2 className="dev-dashboard__section-title">Crear juego</h2>
      <p className="dev-dashboard__muted">
        Quedará oculto del catálogo hasta que publiques su primera versión.
      </p>

      <div className="dev-create__grid">
        <div className="dev-create__fields">
          <div className="dev-upload__field">
            <label htmlFor="cg-title">Título</label>
            <input id="cg-title" type="text" maxLength={80} value={form.title} onChange={set('title')} disabled={busy} />
          </div>
          <div className="dev-upload__field">
            <label htmlFor="cg-genre">Género</label>
            <input id="cg-genre" type="text" maxLength={40} placeholder="Plataformas, RPG, Puzzle…"
              value={form.genre} onChange={set('genre')} disabled={busy} />
          </div>
          <div className="dev-upload__field">
            <label htmlFor="cg-desc">Descripción</label>
            <textarea id="cg-desc" rows={4} maxLength={1000} value={form.description}
              onChange={set('description')} disabled={busy} />
          </div>
          <div className="dev-upload__field">
            <label htmlFor="cg-credits">Créditos (opcional)</label>
            <input id="cg-credits" type="text" maxLength={300} placeholder="Ana (programación), Beto (arte)…"
              value={form.credits} onChange={set('credits')} disabled={busy} />
          </div>
          <label className="dev-create__check">
            <input type="checkbox" checked={form.is_academic} disabled={busy}
              onChange={e => setForm(f => ({ ...f, is_academic: e.target.checked }))} />
            Es un proyecto académico (muestra la insignia y los créditos)
          </label>
        </div>

        <div className="dev-upload__field">
          <label htmlFor="cg-cover">Portada (PNG/JPG/WebP, 16:10, máx. 5 MB)</label>
          <div className="dev-create__preview">
            {preview
              ? <img src={preview} alt="Vista previa de la portada" />
              : <span>Sin portada: se usará un fondo con el título</span>}
          </div>
          <input id="cg-cover" type="file" accept="image/png,image/jpeg,image/webp"
            onChange={handleCover} disabled={busy} />
        </div>
      </div>

      {error && <p className="dev-upload__error" role="alert">{error}</p>}

      <div className="dev-version__actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creando…' : 'Crear juego'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default CreateGameForm
