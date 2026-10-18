# Dev4Gaming — Contexto del proyecto (CLAUDE.md)

> Última revisión: 2026-10-12. Fuente de verdad = el código. Si difieren, verifica el código y actualiza este archivo.

Plataforma web (MVP, en español) para descubrir juegos indie en **beta** y dejar reseñas con calificación 1–5 ★.
Proyecto escolar UAdeO (materias E-Marketing y SOA). El módulo de reseñas se presenta como "microservicio".

## 1. Stack y comandos

- React 19 (funcional + hooks) · Vite 8 · React Router DOM 7 · @supabase/supabase-js 2 · tus-js-client 4 (solo en el panel del dev)
- JavaScript (sin TypeScript) · CSS propio por página/componente (sin Tailwind ni CSS Modules) · Oxlint
- Sin backend propio: el frontend habla directo con Supabase (Postgres + Auth) protegido por RLS.

```bash
npm install
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Build a dist/
npm run preview  # Sirve dist/
npm run lint     # Oxlint (.oxlintrc.json: react + oxc)
```
No hay tests. Tras cambios de código: `npm run lint` y `npm run build`.

`.env` (ignorado por Git; nunca mostrar valores):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
La anon key es pública por diseño; la seguridad depende de RLS. Nunca usar `service_role` en el frontend.
Proyecto Supabase ref: `kbygvkpvushuldyygcba`.

## 2. Estructura

```text
src/
├── main.jsx                 # createRoot + StrictMode
├── App.jsx                  # BrowserRouter > AuthProvider > Navbar + Suspense > Routes. Landing eager; el resto de páginas con React.lazy
├── services/supabase.js     # punto de acceso a Supabase (cliente + queries/mutaciones)
├── services/buildUpload.js  # uploadBuildFile(): subida TUS al bucket builds (aparte para no cargar tus-js-client fuera del panel)
├── utils/
│   ├── utm.js               # captureUtm() / getUtm() — UTM de la sesión en sessionStorage 'd4g_utm'
│   ├── roles.js             # isVerifiedDev, devEntryPath, safeRedirect, postLoginPath (destino tras login según rol)
│   ├── feedback.js          # getDeviceInfo/describeDevice, rememberDownload/getPendingRating/markRated (localStorage), candado anónimo (sessionStorage)
│   ├── builds.js            # PLATFORM_LABEL/ORDER, DEVICE_LABEL, formatBytes, detectPlatform (android|ios|windows|macos|linux), recommendPlatform, isAllowedWebUrl, sha256Hex, safeFileName
│   └── track.js             # trackConversion(event, extra) → conversion_events (+ gtag si existe); trackEvent(event, params) y setUserRole(role) solo GA4 (no-op sin gtag)
├── context/
│   ├── auth-context.js      # createContext(null)
│   ├── AuthContext.jsx      # <AuthProvider>: sesión, profile, verification, displayName, loading, refresh
│   └── useAuth.js           # hook useAuth() (lanza error fuera del provider)
├── hooks/
│   └── useSignupInvite.js   # cuándo abrir SignupInviteModal (ruta, sesión, 3 s, 1 vez por sesión)
├── components/
│   ├── Navbar.jsx           # global, hamburguesa <640px; "Desarrolladores" (o "Mi panel" si es dev verificado) y Login/Perfil según sesión
│   ├── SignupInviteModal.jsx # invitación a registrarse (portal, role=dialog, focus trap); montada en App vía <SignupInvite>
│   ├── HeroInfluencer.jsx   # hero de Landing: video 9:16 del influencer + H1 + CTAs + conteos (2 col ≥900px)
│   ├── CampaignBanner.jsx   # bajo el navbar si utm_source ∈ tiktok|instagram|discord|email; × lo oculta en la sesión
│   ├── ProtectedRoute.jsx   # redirige a loginTo si no hay user
│   ├── GameCover.jsx        # portada 16:10 desde cover_url; respaldo degradado + título si falta/falla
│   ├── StarRating.jsx       # estrellas de solo lectura (promedio)
│   ├── GameCard.jsx         # tarjeta del catálogo: portada, DEMO GRATIS, ★ promedio, botón "▶ Jugar"
│   ├── GameBuilds.jsx       # recuadro de descarga de la ficha: plataforma/versión, descargar o jugar (iframe), SHA-256, Qué probar, changelog, instalación; sin builds → "Build próximamente"
│   ├── ReviewForm.jsx       # formulario + selector de estrellas + versión (build_id); candado anónimo por sesión
│   ├── BugReportForm.jsx    # reporte de bug (requiere sesión): versión, severidad, pasos, dispositivo autodetectado, captura opcional
│   ├── DevGameList.jsx      # "Mis juegos": portada, nº de versiones, plataformas, visible/oculto + tarjeta "Crear juego"
│   ├── CreateGameForm.jsx   # título, género, descripción, créditos, proyecto académico, portada (vista previa)
│   ├── VersionForm.jsx      # versión multiplataforma: datos comunes 1 vez + 1 fila por plataforma (apk/zip/enlace/URL web), progreso y reintento por fila
│   ├── VersionList.jsx      # versiones agrupadas con métricas por plataforma; publicar/archivar versión completa o plataforma
│   ├── BuildSelect.jsx      # select "Versión que probaste" compartido por reseña y bug
│   └── ReviewList.jsx       # lista de reseñas (avatar inicial, fecha es-MX, estrellas)
├── pages/
│   ├── Landing.jsx  Catalog.jsx  GameDetail.jsx
│   ├── Login.jsx    Profile.jsx  VerifyDeveloper.jsx
│   ├── Developers.jsx       # /desarrolladores: landing para devs (beneficios, cómo funciona, confianza); CTA según estado
│   ├── DevDashboard.jsx     # /dev/dashboard: Mis juegos (sin params) · Crear juego (?nuevo=1) · detalle (?juego=<id>) con nueva versión y versiones/métricas
├── styles/                  # global.css + 1 CSS por página/componente
└── assets/                  # hero.png (sin usar), vite.svg
public/covers/*.svg          # portadas originales 1600x1000 (void-runner, shadow-forge, pixel-siege)
public/media/                # ⚠ medios de PRUEBA del hero (mp4, poster svg, .vtt); config en HERO_CAMPAIGN de Landing.jsx
supabase_setup.sql           # ⚠ desactualizado: solo games/reviews (ver §4)
supabase_funnel.sql          # migración del embudo (aplicada 2026-10-12)
supabase_builds.sql          # builds, downloads, bug_reports, roles, RLS (aplicada 2026-10-18)
supabase_storage.sql         # buckets privados builds / bug-screenshots + políticas (aplicada 2026-10-18)
supabase/functions/get-download-url/index.ts  # Edge Function (Deno) desplegada, verify_jwt on
supabase_dev_metrics.sql     # RPC get_build_metrics (aplicada 2026-10-18)
supabase_dev_games.sql       # games.is_listed + triggers, INSERT de juegos por devs, bucket público game-covers (aplicada 2026-10-18)
seed_academic_games.sql      # PLANTILLA con TODO (no aplicada): 1–3 juegos académicos
```
Hooks custom: `context/useAuth.js` y `hooks/useSignupInvite.js`.

## 3. Rutas (src/App.jsx)

| Ruta | Página | Acceso | Notas |
|---|---|---|---|
| `/` | Landing | pública | CTA del hero "Soy desarrollador" → `devEntryPath()`; franja secundaria `.dev-strip` bajo el hero → `/desarrolladores` |
| `/desarrolladores` | Developers | pública | CTA `devEntryPath()`: registro con rol dev → verificación → `/profile` (pendiente) → `/dev/dashboard` |
| `/games` | Catalog | pública | |
| `/juego/:id` | GameDetail | pública | 2 columnas (juego + descarga + distribución / reseñas); 1 columna <760px |
| `/games/:id` | redirect | pública | `LegacyGameRedirect` → `/juego/:id` |
| `/login` | Login | pública | tabs login/registro (`?mode=register` abre registro). Registro con selector "Quiero probar juegos" / "Quiero publicar mi juego" (`?role=developer` preselecciona dev) → `signup_intent`. Con sesión redirige con `postLoginPath()`: dev (param o intención) → verificación/perfil/panel; si no `?redirect=` (solo rutas internas); si no por rol: panel, perfil, verificación pendiente o `/games` |
| `/profile` | Profile | `ProtectedRoute` | rol JUGADOR / DESARROLLADOR + estado; cerrar sesión |
| `/dev/dashboard` | DevDashboard | `ProtectedRoute loginTo="/login?redirect=%2Fdev%2Fdashboard"` | solo `role` dev_verified/admin o verificación approved; si no, CTA a verificación |
| `/developer/verify` | VerifyDeveloper | `ProtectedRoute loginTo="/login?role=developer"` | formulario independiente/empresa |

No hay ruta 404 (catch-all).

## 4. Datos (Supabase)

Funciones en `services/supabase.js` (todas lanzan `error` si Supabase lo devuelve):
- Juegos: `getGames()` (solo `is_listed`, orden `created_at desc`), `getGameById(id)` (abre aunque esté oculto: vista previa), `getHomeStats()` (conteos `head:true`: juegos beta listados + reseñas)
- Reseñas: `getReviewsByGame(gameId)` (incluye `build:builds(version, platform)`), `postReview({game_id, build_id, user_id, user_name, rating, comment, utm_source})` (errores: code `P0429` límite anónimo por IP, `23514` build inválido), `getReviewStats()` (1 consulta, agregado en cliente → `{[game_id]: {avg, count}}`), `getAverageRating(gameId)` (no se usa)
- Panel dev: `getMyGames(userId)` (games.owner_id + `builds(id, version, platform, status)`), `uploadGameCover(userId, file)` → URL pública, `createGame(game)`, `getBuildMetrics(gameId)` (RPC), `createBuild(row)` (status pending_review), `updateBuildStatus(buildId, status)`, `updateVersionStatus(gameId, version, status)` (todas las plataformas); `uploadBuildFile({path, file, onProgress})` en services/buildUpload.js → `{promise, abort}` (TUS a `/storage/v1/upload/resumable`, trozos de 6 MB, reanuda subidas previas)
- Bugs: `uploadBugScreenshot(gameId, userId, file)` → ruta en `bug-screenshots`, `submitBugReport(report)`
- Builds: `getPublishedBuilds(gameId)` (solo `published`, recientes primero), `getDownloadUrl(buildId)` → `supabase.functions.invoke('get-download-url')`; lanza `Error` con el mensaje de la función y `err.status`
- Conversiones: `insertConversionEvent(row)` (sin `.select()`: no hay SELECT público), `getCurrentUserId()`
- Auth: `signUp({email,password,displayName,utmSource,signupIntent})` (guarda `display_name`, `utm_source` y `signup_intent` en metadata), `signIn`, `signOut`
- Perfil/dev: `getProfile(userId)`, `getMyVerification(userId)`, `submitVerification(userId, fields)` (upsert `onConflict: user_id`, status `pending`)

Esquema real en la BD (public):
- `games`: id uuid PK, title, description, genre, developer_name, image_url (placeholders, ya no se usa), status ('beta'|'released', default beta), created_at, cover_url, platform, download_size, version, is_academic (default false), credits, owner_id → auth.users (null = nadie sube builds; los 3 de ejemplo), **is_listed** (default true). Con dueño: nace oculto (trigger `games_before_insert`) y `builds_refresh_game_listing` lo lista solo si tiene ≥ 1 build publicado; sin dueño no se toca
- `builds`: id, game_id → games (cascade), version, platform ('android'|'windows'|'linux'|'macos'|'web'), storage_provider ('supabase'|'r2'|'external'), file_path, web_entry_url (solo web; https de itch.io/github.io), size_bytes, sha256 (hex 64), changelog, test_focus, min_requirements, status ('pending_review'|'published'|'archived'), created_at. UNIQUE(game_id, version, platform). En Supabase solo .apk/.zip ≤ 50 MB (plan Free)
- `downloads`: id bigserial, build_id → builds, user_id, created_at. **Solo la escribe la Edge Function** (service role)
- `bug_reports`: id, game_id, build_id (null = versión no especificada), user_id (default auth.uid()), description, steps_to_reproduce, severity ('low'|'medium'|'high'|'crash'), device_info jsonb, screenshot_path, status ('open'|'resolved'), created_at
- `private.app_secrets` (esquema no expuesto por la API): `review_ip_salt`, generado aleatorio al migrar
- `reviews`: id, game_id → games (cascade), user_name, rating 1–5, comment, created_at, **user_id uuid nullable → auth.users**, utm_source, build_id → builds (null = "Versión no especificada"), client_ip_hash (HMAC-SHA256 con salt secreto). Trigger `reviews_before_insert`: valida que el build sea del juego y esté publicado; máx. 5 reseñas anónimas por juego, IP y 24 h
- `profiles`: id → auth.users PK, display_name, created_at, utm_source, **role** ('player'|'dev_pending'|'dev_verified'|'admin', default player), **signup_intent** ('player'|'developer'|null). Se crea por trigger `on_auth_user_created` → `handle_new_user()` (copia `display_name`, `utm_source` y `signup_intent` de raw_user_meta_data; nunca asigna role). `role` lo mantiene el trigger `on_dev_verification_change` (pending→dev_pending, approved→dev_verified, rejected→player; no toca admin)
- `conversion_events`: id uuid PK, event (CHECK: sign_up|submit_review|download_click|play_click), game_id → games (set null), user_id → auth.users (set null), utm_source/medium/campaign (≤100), created_at (indexado)
- `developer_verifications`: user_id PK → auth.users, type ('independent'|'company'), legal_name, website, portfolio_url, tax_id, status ('pending'|'approved'|'rejected'), created_at

RLS (todas habilitadas):
- games: SELECT público (el catálogo filtra `is_listed`). INSERT para dev verificado con `owner_id = auth.uid()`. Sin UPDATE/DELETE para clientes (editar/borrar desde el dashboard).
- reviews: SELECT público; INSERT si `user_id IS NULL OR user_id = auth.uid()`.
- profiles: SELECT solo el propio.
- developer_verifications: SELECT/INSERT propio (status='pending'); UPDATE propio si no está `approved` y deja `pending`. La aprobación es manual (dashboard).
- conversion_events: INSERT a anon/authenticated si `user_id IS NULL OR user_id = auth.uid()`. Sin SELECT (no existe rol admin): se lee solo desde dashboard/service_role.
- builds: SELECT si `published` o `owns_game()`; INSERT/UPDATE si `is_verified_dev() AND owns_game()`; sin DELETE (se archiva).
- downloads: RLS sin políticas (a propósito): ningún cliente lee ni escribe.
- bug_reports: INSERT autenticado (`user_id = auth.uid()`, build publicado del mismo juego); SELECT propios o de mis juegos; UPDATE el dev dueño.
- Helpers SECURITY DEFINER: `is_verified_dev()` (verificación approved o role admin), `owns_game(game_id)`, `build_is_published_for(build_id, game_id)`; conservan EXECUTE para anon/authenticated porque las usan las políticas. Las funciones de trigger no son invocables por RPC.

Storage (buckets **privados**, nunca públicos):
- `builds` (50 MB, apk/zip): ruta `{game_id}/{version}/{platform}/{archivo}`. INSERT/UPDATE/SELECT solo el dev verificado dueño del juego (carpeta 1 = game_id). **Jugadores sin SELECT**: descargan solo con la URL firmada de la Edge Function.
- `game-covers` (**público**, 5 MB, png/jpg/webp): portadas visibles en el catálogo. Ruta `{user_id}/{archivo}`; INSERT solo dev verificado en su carpeta.
- `bug-screenshots` (5 MB, png/jpg/webp): ruta `{game_id}/{user_id}/{archivo}`. INSERT en su propia carpeta; SELECT el autor o el dueño del juego.

Edge Function `get-download-url` (POST `{build_id}` + JWT de usuario): 401 sin sesión (la anon key no basta); 404 si no está `published`; 400 si es web. Firma 300 s, inserta en `downloads` con service role y devuelve `{url, expires_in, sha256, size_bytes, version, platform}`. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase (sin secrets manuales). `storage_provider='external'` devuelve la URL tal cual; `r2` = TODO. Redeploy: `supabase functions deploy get-download-url`.

**Operación manual (dashboard → SQL Editor):**
```sql
-- Aprobar a un dev (el trigger pone profiles.role = 'dev_verified')
update public.developer_verifications set status = 'approved'
 where user_id = (select id from auth.users where email = 'correo@ejemplo.com');

-- Asignar dueño a un juego (p. ej. los académicos) para que pueda subir builds
update public.games set owner_id = (select id from auth.users where email = 'correo@ejemplo.com')
 where id = '<uuid del juego>';

-- Admin (salta la verificación en is_verified_dev)
update public.profiles set role = 'admin' where id = '<uuid del usuario>';
```

`supabase_setup.sql` NO incluye profiles, developer_verifications, reviews.user_id, el trigger ni las políticas nuevas; lo del embudo está en `supabase_funnel.sql`. Si cambias esquema, actualiza ese SQL, este archivo y los consumidores.

## 5. Flujos clave

**Auth** (`AuthContext.jsx`): `getSession()` + `onAuthStateChange`; al haber `user.id` carga `profile` y `verification` en paralelo (errores → null). `displayName = profile.display_name || prefijo del email`. `loading` = sesión no verificada o datos del usuario aún no cargados. `refresh()` recarga tras enviar verificación.

**Catálogo** (`Catalog.jsx`): `Promise.all([getGames(), getReviewStats().catch(() => ({}))])` al montar → géneros derivados con `new Set(...)` + "Todos" → filtro 100% en cliente (`activeGenre`). Estados: skeletons (6), error con "Reintentar", vacío, contador. Sin reseñas: "Sin reseñas aún, sé el primero". "▶ Jugar" → `trackConversion('play_click')` + navigate a `/juego/:id`.

**Detalle** (`GameDetail.jsx`): `Promise.all([getGameById, getReviewsByGame, getPublishedBuilds().catch(() => [])])`; promedio y distribución 5★→1★ en cliente; reseña nueva se antepone sin re-fetch. Badge "Proyecto académico" (`.badge-academic`, global.css) y créditos si `is_academic`/`credits`. `GameBuilds` (key=id): `recommendPlatform` (dispositivo → su build; iPhone o sin build → web; si no, la primera) con etiqueta "Recomendada para tu dispositivo", aviso "Aún no hay versión para X" y "También disponible para…" con las demás; web → botón "Jugar en el navegador" que monta el iframe (`sandbox="allow-scripts allow-same-origin allow-pointer-lock"`, `allow="fullscreen; gamepad"`, solo si `isAllowedWebUrl`); descargable sin sesión → link a `/login?redirect=`; con sesión → `getDownloadUrl` + `trackConversion('download_click')` + `location.assign(url)`. Cada reseña muestra "Versión X", "Versión no especificada" (build_id null) o "Versión retirada" (build ya no visible).

**Campaña / UTM**: `App` llama `captureUtm()` como inicializador de `useState` (una vez). Guarda utm_source/medium/campaign/content en sessionStorage `d4g_utm`; sin UTM ni nada guardado → `{utm_source:'direct'}`; nunca pisa un UTM con 'direct'. `CampaignBanner` recibe `utm.utm_source`; al cerrarlo se guarda `d4g_banner_closed`.

**Conversiones** (`utils/track.js`): `trackConversion(event, extra)` inserta en `conversion_events` con UTM + user_id de sesión y llama `window.gtag` si existe; nunca lanza (try/catch + console.warn). Puntos: `play_click` (Catalog), `download_click` (GameDetail), `submit_review` (ReviewForm; además guarda `utm_source` en la reseña), `sign_up` (Login tras `signUp`; cuenta el envío aunque falte confirmar el correo).

**Reseñas** (`ReviewForm.jsx`):
- Versión: `BuildSelect` controlado por GameDetail (`feedbackBuildId`, compartido con el bug). Default: `?build=` → última descarga sin calificar → build más reciente; `''` = no especificada.
- Anónimas: 1 por juego por sesión del navegador (sessionStorage `d4g_anon_reviews`) + 5 por juego/IP/24 h en la base.
- Autenticado: "Publicarás como {displayName}", envía `user_id = user.id`, `user_name = displayName`.
- Anónimo: nombre opcional (máx 50); vacío → `Anonimo####` aleatorio; `user_id = null`.
- Estrellas: 5 `<button>` con hover (`hovered || rating`), `aria-label`, `aria-pressed`; sin estrellas → "Elige de 1 a 5 estrellas para publicar."; comentario requerido (máx 500, contador).
- Éxito: confirmación persistente + callback `onReviewPosted`; sin sesión, botón "Crear cuenta para guardar mis reseñas" → `/login?mode=register`.

**Panel del dev** (`DevDashboard`): vistas por URL (`?nuevo=1`, `?juego=<id>`). Crear juego = portada a `game-covers` → `createGame` (oculto). Nueva versión: versión/changelog/Qué probar/requisitos una vez + filas por plataforma; cada fila, en orden: SHA-256 en el navegador (`sha256Hex`) → subida TUS a `{game_id}/{version}/{platform}/{archivo}` (un 409 en reintento = ya subido) → `createBuild` en `pending_review`. Si una falla, las demás quedan guardadas y la versión se bloquea para reintentar esa fila. Publicar/archivar por versión (`updateVersionStatus`) o por plataforma; publicar lista el juego. Validación cliente: android `.apk`, windows/macos/linux `.zip`, ≤ 50 MB; si pesa más, error que sugiere "Enlace externo" (`storage_provider='external'`, URL https; el archivo local opcional solo sirve para calcular tamaño/SHA). Web: URL https de itch.io/github.io. Métricas (`get_build_metrics`, SECURITY DEFINER, solo dueño/admin): descargas y usuarios únicos, reseñas y promedio, bugs por severidad y conversión descarga→reseña (solo reseñas con cuenta). Sin juegos asignados → estado vacío (owner_id se asigna a mano, ver §4).

**Bugs** (`BugReportForm`, columna izquierda de la ficha): se despliega con "Reportar"; sin sesión pide login con redirect. Severidad low/medium/high/crash (Baja/Media/Alta/Crash), descripción (requerida), pasos, `device_info` (userAgentData si existe), captura PNG/JPG/WebP ≤ 5 MB.

**Aviso para calificar**: tras una descarga exitosa se guarda en localStorage `d4g_downloads` y se muestra "¿Ya probaste la vX?" (también al volver otro día). "Calificar ahora" → `?build=<id>`, baja a `#resena` y enfoca la 1.ª estrella; "Ahora no" o reseñar ese build lo marca en `d4g_rated_builds`.

**Hero** (`HeroInfluencer`): autoplay muted salvo `prefers-reduced-motion`; subtítulos del `<track>` pintados a mano (mode hidden + cuechange); si el video falla muestra el poster. Eventos GA4 vía `trackEvent`: `hero_video_play` (clic), `hero_video_unmute`, `hero_video_complete` (90%, 1 vez por montaje), `hero_cta_click {cta}`. Tokens `--hero-*` y fuentes Chakra Petch / IBM Plex Sans en global.css.

**Invitación a registrarse** (`useSignupInvite` + `SignupInviteModal`): sin sesión (espera `loading`), solo en `/games` y `/juego/:id`, 3 s tras entrar; no abre si el foco está dentro de `[data-no-signup-invite]` (ReviewForm) y reintenta cada 3 s. Una vez por sesión: sessionStorage `d4g_signup_invite`. CTAs → `/login?mode=register&redirect=…` y `/login?redirect=…`. Bloquea scroll del body y pone `inert` en `#root`. GA4: `signup_modal_view {page}`, `signup_modal_cta {action}`, `signup_modal_dismiss {method}`. `sign_up` lleva `method: 'email'`; marcarlo como evento clave se hace en GA4 Admin.

**Analítica (GA4)**: hoy **no hay GA4 cargado**. `trackEvent(event, params)` y `setUserRole(role)` (utils/track.js) no hacen nada si `window.gtag` no existe; `trackConversion` además escribe siempre en `conversion_events` (embudo propio). Todos los eventos llevan los UTM de la sesión.

User property **`user_role`** (`setUserRole`, desde `AuthContext` al terminar de cargar): `anonymous` | `player` | `dev_pending` | `dev_verified` | `admin` (= `profiles.role`).

| Evento | Dónde | Parámetros |
|---|---|---|
| `sign_up` | Login (registro; vía `trackConversion`) | `method: 'email'`, `role: 'player'\|'developer'` |
| `login` | Login (inicio de sesión) | `method: 'email'` |
| `build_download` | GameDetail (URL firmada OK) | `game_id, build_id, version, platform` |
| `web_play_start` | GameBuilds ("Jugar en el navegador") | `game_id, build_id, version` |
| `review_submit` | ReviewForm (reseña publicada) | `game_id, build_id, version, rating, anonymous` |
| `bug_report_submit` | BugReportForm | `game_id, build_id, severity, has_steps, has_screenshot` |
| `dev_verification_request` | VerifyDeveloper | `type, resubmission` |
| `game_create` | DevDashboard (juego creado) | `game_id, is_academic` |
| `build_upload` | DevDashboard (cada plataforma guardada) | `game_id, build_id, version, platform, storage_provider, size_bytes` |
| `hero_video_play` / `hero_video_unmute` / `hero_video_complete` / `hero_cta_click` | HeroInfluencer | ver **Hero** |
| `signup_modal_view` / `signup_modal_cta` / `signup_modal_dismiss` | useSignupInvite | ver **Invitación** |
| `play_click`, `download_click`, `submit_review` | `trackConversion` (embudo propio; también llegan a GA4) | `game_id` (+ `rating`). En GA4 usar `review_submit`, no `submit_review`, para no contar doble |

**Activar GA4 (pendiente, sin tocar el código de eventos):**
1. `.env`: `VITE_GA_ID=G-XXXXXXXXXX` (y la misma variable en el hosting).
2. `index.html`, dentro de `<head>` (Vite reemplaza `%VITE_GA_ID%` al compilar):
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=%VITE_GA_ID%"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '%VITE_GA_ID%');
</script>
```
3. GA4 Admin: marcar `sign_up`, `build_download` y `review_submit` como eventos clave; crear la dimensión personalizada de usuario `user_role` y las de evento que se quieran analizar (`platform`, `severity`, `version`…).
4. Si se agrega aviso de cookies, inicializar con Consent Mode antes del `config`.

## 6. Sistema de diseño

Estética "gamer" oscura con neón. Variables en `src/styles/global.css` — usarlas siempre:

| Token | Valor | Uso |
|---|---|---|
| `--bg-base` / `--bg-surface` / `--bg-elevated` | #080810 / #0f0f1a / #16162a | fondo, tarjetas, inputs |
| `--blue` / `--blue-glow` | #00BFFF / #00d4ff | acento principal, links, btn-primary |
| `--purple` / `--purple-glow` | #7B2FBE / #9b3ede | acento secundario, btn-purple |
| `--text-primary/secondary/muted` | #F0F0FF / #8888aa / #555577 | texto |
| `--border` / `--border-accent` | #1e1e35 / #2e2e55 | bordes |
| `--glow-blue/-purple/-dual` | box-shadows neón | hover |
| `--radius-sm/md/lg` | 6 / 12 / 20px | |
| `--container` | 1200px | `.container` (padding 1.5rem) |

Colores semánticos hardcodeados (candidatos a variables): estrellas/pending `#f59e0b`, éxito/approved `#00ff88`, error/rejected `#ff6b6b`, texto sobre azul `#06060f`.

Tipografía (Google Fonts vía `@import` en global.css): **Orbitron** (`--font-display`, h1–h3) e **Inter** (`--font-body`). Tamaños de heading con `clamp()`.

Componentes/clases reutilizables:
- Botones: `.btn` + `.btn-primary` (azul sólido) | `.btn-secondary` (outline azul) | `.btn-purple`
- `.card`: superficie + borde; hover → borde azul, `--glow-dual`, translateY(-4px)
- Utilidades: `.text-blue`, `.text-purple`, `.text-muted`, `.glow-blue`, `.fade-in` (animación de entrada)
- Badges: `game-card__badge--beta|released`, `auth__badge--pending|approved|rejected`
- Skeletons con gradiente animado (`catalog__skeleton`, `gd-skeleton`)
- Modal: solo `SignupInviteModal` (no hay Modal genérico).

Breakpoints usados: 900, 768, 640, 560, 480px. Respeta `prefers-reduced-motion`.

## 7. Convenciones

- Componentes funcionales; `function Nombre()` + `export default` al final.
- Páginas orquestan datos/estado; componentes son presentacionales; **toda** query va en `services/supabase.js`.
- Cada página/componente importa su propio CSS (`import '../styles/x.css'`).
- Clases BEM con prefijo del bloque: `catalog__filter-btn--active`, `game-card__title`, `auth__field`, `gd-*` (skeleton del detalle).
- Estado local con `useState`; `try/catch/finally` con mensajes de error amigables en español.
- Siempre contemplar estados carga / error / vacío.
- Todo texto de UI en español (fechas `es-MX`).
- Accesibilidad: `aria-label` en botones de ícono, `htmlFor` en labels, `alt` en imágenes.
- No añadir dependencias sin necesidad. No exponer secretos.

## 8. Estado del MVP

Completo: landing, catálogo con filtro por género, detalle, reseñas anónimas/autenticadas con estrellas, registro/login, perfil, solicitud de verificación de desarrollador.

Pendiente / deuda:
- Activar GA4 (ver **Analítica (GA4)**: script + `VITE_GA_ID`); eventos aún sin instrumentar: `view_item`, `select_content` (filtro del catálogo). Lectura de `conversion_events` solo por dashboard (no hay rol admin); inserts anónimos sin rate limit.
- Editar o borrar juegos desde el panel (hoy solo crear; no hay UPDATE/DELETE para devs).
- Panel admin para aprobar verificaciones y moderar reseñas.
- `getAverageRating` quedó redundante (lo reemplaza `getReviewStats`): eliminarlo. `getReviewStats` trae todas las filas de reviews; con más volumen, pasar a vista/RPC agregada.
- Búsqueda por texto / orden en catálogo; paginación.
- Ruta 404; `index.html` con `lang="en"` y `<title>dev4gaming</title>` genéricos; sin meta SEO/OG.
- Hero: reemplazar medios de prueba de `public/media/` por el MP4/poster/.vtt reales del influencer y ajustar `HERO_CAMPAIGN`.
- `supabase_setup.sql` y README (plantilla Vite) desactualizados.
- RLS de reviews permite `user_id NULL` con cualquier `user_name` (suplantación de nombres); sin rate limit.
