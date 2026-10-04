import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── GAMES ────────────────────────────────────────────────

/**
 * Obtiene todos los juegos disponibles en el catálogo.
 */
export async function getGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
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
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function postReview({ game_id, user_id = null, user_name, rating, comment }) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ game_id, user_id, user_name, rating, comment }])
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── AUTH ─────────────────────────────────────────────────

export async function signUp({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
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
