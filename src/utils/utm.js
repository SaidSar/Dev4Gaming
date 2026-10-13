// Atribución de campaña: captura los parámetros UTM de la URL de entrada
// y los conserva durante la sesión del navegador.

const STORAGE_KEY = 'd4g_utm'
const UTM_FIELDS  = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
const MAX_LENGTH  = 100

// Respaldo en memoria por si sessionStorage está bloqueado (modo privado, etc.)
let memoryUtm = null

function readStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function store(utm) {
  memoryUtm = utm
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
  } catch {
    // Sin sessionStorage: nos quedamos con la copia en memoria
  }
}

/**
 * Lee los UTM de la URL actual y los guarda en sessionStorage ('d4g_utm').
 * - Si la URL trae utm_source, se guarda (última campaña de la sesión).
 * - Si no trae nada y no hay nada guardado, se guarda { utm_source: 'direct' }.
 * - Nunca reemplaza un UTM ya guardado por 'direct'.
 * @returns {object} el UTM vigente de la sesión
 */
export function captureUtm() {
  const params = new URLSearchParams(window.location.search)
  const found = {}

  UTM_FIELDS.forEach(field => {
    const value = params.get(field)?.trim().slice(0, MAX_LENGTH)
    if (value) found[field] = field === 'utm_source' ? value.toLowerCase() : value
  })

  if (found.utm_source) {
    store(found)
  } else if (!readStored() && !memoryUtm) {
    store({ utm_source: 'direct' })
  }

  return getUtm()
}

/**
 * Devuelve el UTM guardado de la sesión ({ utm_source: 'direct' } si no hay).
 */
export function getUtm() {
  return readStored() ?? memoryUtm ?? { utm_source: 'direct' }
}
