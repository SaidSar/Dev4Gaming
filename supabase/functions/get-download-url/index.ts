// Edge Function: get-download-url
// POST { build_id } con el JWT del usuario en Authorization.
// 1. Exige sesión de usuario (la anon key sola no basta).
// 2. Exige que el build exista, esté `published` y no sea web.
// 3. Firma la URL (300 s), registra la descarga en `downloads` y la
//    devuelve con el SHA-256 y el tamaño para que el cliente los muestre.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase: no hay
// secrets que configurar. La service key nunca sale de aquí.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SIGNED_URL_TTL = 300 // segundos
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  // ── 1. Sesión ──
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Inicia sesión para descargar' })

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  const user = userData?.user
  if (userError || !user) return json(401, { error: 'Inicia sesión para descargar' })

  // ── 2. Build publicado ──
  let buildId: unknown
  try {
    ({ build_id: buildId } = await req.json())
  } catch {
    return json(400, { error: 'Cuerpo inválido' })
  }
  if (typeof buildId !== 'string' || !UUID_RE.test(buildId)) {
    return json(400, { error: 'build_id inválido' })
  }

  const { data: build, error: buildError } = await admin
    .from('builds')
    .select('id, game_id, version, platform, storage_provider, file_path, size_bytes, sha256, status')
    .eq('id', buildId)
    .maybeSingle()

  if (buildError) return json(500, { error: 'No se pudo consultar el build' })
  if (!build || build.status !== 'published') return json(404, { error: 'Build no disponible' })
  if (build.platform === 'web') return json(400, { error: 'Este build se juega en el navegador' })
  if (!build.file_path) return json(404, { error: 'Build sin archivo' })

  // ── 3. URL ──
  let url: string
  if (build.storage_provider === 'supabase') {
    const fileName = build.file_path.split('/').pop()
    const { data: signed, error: signError } = await admin.storage
      .from('builds')
      .createSignedUrl(build.file_path, SIGNED_URL_TTL, { download: fileName })
    if (signError || !signed) return json(500, { error: 'No se pudo generar el enlace' })
    url = signed.signedUrl
  } else {
    // 'external' (GitHub Releases, etc.) se entrega tal cual.
    // TODO(r2): firmar con la API S3 de R2 cuando se use storage_provider = 'r2'.
    url = build.file_path
  }

  // Se registra solo si hubo enlace: métrica de descargas reales
  const { error: insertError } = await admin
    .from('downloads')
    .insert({ build_id: build.id, user_id: user.id })
  if (insertError) return json(500, { error: 'No se pudo registrar la descarga' })

  return json(200, {
    url,
    expires_in: build.storage_provider === 'supabase' ? SIGNED_URL_TTL : null,
    sha256: build.sha256,
    size_bytes: build.size_bytes,
    version: build.version,
    platform: build.platform,
  })
})
