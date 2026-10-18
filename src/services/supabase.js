import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── GAMES ────────────────────────────────────────────────

/**
 * Juegos del catálogo público: solo `is_listed` (los de devs aparecen
 * cuando tienen al menos un build publicado).
 */
export async function getGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_listed', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Obtiene un juego por su ID.
 * @param {string} id - UUID del juego
 */
export async function getGameById(id) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ─── REVIEWS (MICROSERVICIO) ───────────────────────────────

/**
 * GET — Obtiene todas las reseñas de un juego específico.
 * @param {string} gameId - UUID del juego
 */
export async function getReviewsByGame(gameId) {
  // build: versión ligada (null si no hay build_id o el build ya no es visible)
  const { data, error } = await supabase
    .from('reviews')
    .select('*, build:builds(version, platform)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Publica una reseña. build_id es opcional (null = versión no especificada).
 * Errores de la base: code 'P0429' = límite de reseñas anónimas por IP;
 * code '23514' = la versión no es de este juego o no está publicada.
 */
export async function postReview({ game_id, build_id = null, user_id = null, user_name, rating, comment, utm_source = null }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ game_id, build_id, user_id, user_name, rating, comment, utm_source }])
    .select('*, build:builds(version, platform)')
    .single()

  if (error) throw error
  return data
}

/**
 * Promedio y conteo de reseñas de TODOS los juegos con una sola consulta
 * (se agrega en el cliente para evitar N+1).
 * @returns {Object<string, {avg: number, count: number}>} indexado por game_id
 */
export async function getReviewStats() {
  const { data, error } = await supabase
    .from('reviews')
    .select('game_id, rating')

  if (error) throw error

  const totals = {}
  for (const { game_id, rating } of data) {
    const t = totals[game_id] ?? (totals[game_id] = { sum: 0, count: 0 })
    t.sum += rating
    t.count += 1
  }

  const stats = {}
  for (const [gameId, { sum, count }] of Object.entries(totals)) {
    stats[gameId] = { avg: Math.round((sum / count) * 10) / 10, count }
  }
  return stats
}

/**
 * Conteos para el hero de la portada: juegos en beta y reseñas totales.
 * Usa `head: true` para que Supabase devuelva solo el conteo, sin filas.
 * @returns {{betaGames: number, reviews: number}}
 */
export async function getHomeStats() {
  const [games, reviews] = await Promise.all([
    supabase.from('games').select('id', { count: 'exact', head: true }).eq('status', 'beta').eq('is_listed', true),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
  ])

  if (games.error) throw games.error
  if (reviews.error) throw reviews.error
  return { betaGames: games.count ?? 0, reviews: reviews.count ?? 0 }
}

// ─── BUILDS Y DESCARGAS ───────────────────────────────────

/**
 * Builds publicados de un juego, del más reciente al más antiguo.
 * RLS solo deja ver `published` (o los propios del dev dueño).
 * @param {string} gameId - UUID del juego
 */
export async function getPublishedBuilds(gameId) {
  const { data, error } = await supabase
    .from('builds')
    .select('id, version, platform, storage_provider, web_entry_url, size_bytes, sha256, changelog, test_focus, min_requirements, created_at')
    .eq('game_id', gameId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Pide a la Edge Function `get-download-url` un enlace firmado (300 s).
 * Requiere sesión; la función registra la descarga en `downloads`.
 * @param {string} buildId - UUID del build publicado
 * @returns {{url: string, expires_in: number|null, sha256: string|null,
 *            size_bytes: number|null, version: string, platform: string}}
 */
export async function getDownloadUrl(buildId) {
  const { data, error } = await supabase.functions.invoke('get-download-url', {
    body: { build_id: buildId },
  })

  if (error) {
    // FunctionsHttpError trae el JSON { error } de la función en `context`
    const body = await error.context?.json?.().catch(() => null)
    const err = new Error(body?.error || error.message)
    err.status = error.context?.status
    throw err
  }
  return data
}

// ─── PANEL DEL DEV ────────────────────────────────────────

/**
 * Juegos de los que el usuario es dueño, con sus builds (RLS deja al dueño
 * ver todos los estados) para el resumen de "Mis juegos".
 */
export async function getMyGames(userId) {
  const { data, error } = await supabase
    .from('games')
    .select('id, title, genre, cover_url, is_academic, is_listed, created_at, builds(id, version, platform, status)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Sube la portada al bucket público game-covers ({user_id}/{uuid}.ext).
 * @returns {string} URL pública para games.cover_url
 */
export async function uploadGameCover(userId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('game-covers')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return supabase.storage.from('game-covers').getPublicUrl(path).data.publicUrl
}

/**
 * Crea un juego del dev verificado (RLS: owner_id = auth.uid()).
 * Nace oculto del catálogo hasta publicar un build.
 */
export async function createGame(game) {
  const { data, error } = await supabase
    .from('games')
    .insert([{ status: 'beta', ...game }])
    .select('id, title')
    .single()

  if (error) throw error
  return data
}

/** Publica/archiva todas las plataformas de una versión de una vez */
export async function updateVersionStatus(gameId, version, status) {
  const { error } = await supabase
    .from('builds')
    .update({ status })
    .eq('game_id', gameId)
    .eq('version', version)

  if (error) throw error
}

/**
 * Métricas por versión (RPC get_build_metrics): descargas, rating, bugs por
 * severidad y conversión descarga → reseña. Solo responde al dueño.
 */
export async function getBuildMetrics(gameId) {
  const { data, error } = await supabase.rpc('get_build_metrics', { p_game_id: gameId })
  if (error) throw error
  return data
}

/** Registra un build (queda en pending_review hasta publicarlo) */
export async function createBuild(build) {
  const { data, error } = await supabase
    .from('builds')
    .insert([build])
    .select()
    .single()

  if (error) throw error
  return data
}

/** 'published' | 'archived' | 'pending_review' */
export async function updateBuildStatus(buildId, status) {
  const { error } = await supabase
    .from('builds')
    .update({ status })
    .eq('id', buildId)

  if (error) throw error
}

// ─── REPORTES DE BUGS ─────────────────────────────────────

/**
 * Sube una captura al bucket privado bug-screenshots.
 * Ruta: {game_id}/{user_id}/{uuid}.{ext} (la política exige su user_id).
 * @returns {string} ruta del archivo en el bucket
 */
export async function uploadBugScreenshot(gameId, userId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${gameId}/${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('bug-screenshots')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

/**
 * Registra un bug (requiere sesión; user_id lo pone la base con auth.uid()).
 * @param {{game_id, build_id?, description, steps_to_reproduce?, severity,
 *          device_info?, screenshot_path?}} report
 */
export async function submitBugReport(report) {
  const { data, error } = await supabase
    .from('bug_reports')
    .insert([report])
    .select('id')
    .single()

  if (error) throw error
  return data
}

// ─── CONVERSIONES ─────────────────────────────────────────

/**
 * Registra un evento del embudo. Sin .select(): conversion_events
 * no tiene política de lectura pública.
 */
export async function insertConversionEvent(row) {
  const { error } = await supabase.from('conversion_events').insert([row])
  if (error) throw error
}

export async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

// ─── AUTH ─────────────────────────────────────────────────

// utm_source y signup_intent viajan en los metadatos; el trigger handle_new_user()
// los copia a profiles. signup_intent ('player'|'developer') no da permisos:
// el rol de dev solo cambia al enviar/aprobar la verificación.
export async function signUp({ email, password, displayName, utmSource = null, signupIntent = 'player' }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El enlace del correo vuelve al dominio actual (localhost en dev, Vercel en producción)
      emailRedirectTo: window.location.origin,
      data: { display_name: displayName, utm_source: utmSource, signup_intent: signupIntent },
    },
  })
  if (error) throw error
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// ─── VERIFICACIÓN DE DESARROLLADOR ────────────────────────

export async function getMyVerification(userId) {
  const { data, error } = await supabase
    .from('developer_verifications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function submitVerification(userId, fields) {
  const { data, error } = await supabase
    .from('developer_verifications')
    .upsert({ user_id: userId, ...fields, status: 'pending' }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Calcula el rating promedio de un juego.
 * @param {string} gameId - UUID del juego
 * @returns {number} promedio redondeado a 1 decimal
 */
export async function getAverageRating(gameId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('game_id', gameId)

  if (error) throw error
  if (!data.length) return 0

  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
  return Math.round(avg * 10) / 10
}
