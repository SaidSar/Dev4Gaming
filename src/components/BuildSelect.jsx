// Selector "Versión que probaste" para reseñas y bugs ('' = no especificada)
import { PLATFORM_LABEL } from '../utils/builds'

function BuildSelect({ id, builds, value, onChange }) {
  if (!builds.length) return null

  return (
    <div className="review-form__field">
      <label htmlFor={id}>Versión que probaste</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)}>
        {builds.map(b => (
          <option key={b.id} value={b.id}>
            v{b.version} · {PLATFORM_LABEL[b.platform]}
          </option>
        ))}
        <option value="">No lo sé / no especificar</option>
      </select>
    </div>
  )
}

export default BuildSelect
