# Dev4Gaming — Contexto del proyecto (CLAUDE.md)

> Última revisión: 2026-10-12. Fuente de verdad = el código. Si difieren, verifica el código y actualiza este archivo.

Plataforma web (MVP, en español) para descubrir juegos indie en **beta** y dejar reseñas con calificación 1–5 ★.
Proyecto escolar UAdeO (materias E-Marketing y SOA). El módulo de reseñas se presenta como "microservicio".

## 1. Stack y comandos

- React 19 (funcional + hooks) · Vite 8 · React Router DOM 7 · @supabase/supabase-js 2
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
├── App.jsx                  # BrowserRouter > AuthProvider > Navbar + Routes
├── services/supabase.js     # ÚNICO punto de acceso a Supabase (cliente + todas las queries/mutaciones)
├── utils/
│   ├── utm.js               # captureUtm() / getUtm() — UTM de la sesión en sessionStorage 'd4g_utm'
│   └── track.js             # trackConversion(event, extra) → conversion_events (+ gtag si existe)
├── context/
│   ├── auth-context.js      # createContext(null)
│   ├── AuthContext.jsx      # <AuthProvider>: sesión, profile, verification, displayName, loading, refresh
│   └── useAuth.js           # hook useAuth() (lanza error fuera del provider)
├── components/
│   ├── Navbar.jsx           # global, hamburguesa <640px, link Login/Perfil según sesión
│   ├── CampaignBanner.jsx   # bajo el navbar si utm_source ∈ tiktok|instagram|discord|email; × lo oculta en la sesión
│   ├── ProtectedRoute.jsx   # redirige a loginTo si no hay user
│   ├── GameCover.jsx        # portada 16:10 desde cover_url; respaldo degradado + título si falta/falla
│   ├── StarRating.jsx       # estrellas de solo lectura (promedio)
│   ├── GameCard.jsx         # tarjeta del catálogo: portada, DEMO GRATIS, ★ promedio, botón "▶ Jugar"
│   ├── ReviewForm.jsx       # formulario + selector de estrellas
│   └── ReviewList.jsx       # lista de reseñas (avatar inicial, fecha es-MX, estrellas)
├── pages/
│   ├── Landing.jsx  Catalog.jsx  GameDetail.jsx
│   ├── Login.jsx    Profile.jsx  VerifyDeveloper.jsx
├── styles/                  # global.css + 1 CSS por página/componente
└── assets/                  # hero.png (sin usar), vite.svg
public/covers/*.svg          # portadas originales 1600x1000 (void-runner, shadow-forge, pixel-siege)
supabase_setup.sql           # ⚠ desactualizado: solo games/reviews (ver §4)
supabase_funnel.sql          # migración del embudo (aplicada 2026-10-12)
```
No existe carpeta `hooks/` aparte; el único hook custom es `context/useAuth.js`.

## 3. Rutas (src/App.jsx)

| Ruta | Página | Acceso | Notas |
|---|---|---|---|
| `/` | Landing | pública | CTA "Soy desarrollador" → `/login?role=developer`, `/developer/verify` o `/profile` según estado |
| `/games` | Catalog | pública | |
| `/juego/:id` | GameDetail | pública | 2 columnas (juego + descarga + distribución / reseñas); 1 columna <760px |
| `/games/:id` | redirect | pública | `LegacyGameRedirect` → `/juego/:id` |
| `/login` | Login | pública | tabs login/registro (`?mode=register` abre registro); si hay sesión redirige (a `/developer/verify` si `?role=developer`) |
| `/profile` | Profile | `ProtectedRoute` | rol JUGADOR / DESARROLLADOR + estado; cerrar sesión |
| `/developer/verify` | VerifyDeveloper | `ProtectedRoute loginTo="/login?role=developer"` | formulario independiente/empresa |

No hay ruta 404 (catch-all).

## 4. Datos (Supabase)

Funciones en `services/supabase.js` (todas lanzan `error` si Supabase lo devuelve):
- Juegos: `getGames()` (orden `created_at desc`), `getGameById(id)`
- Reseñas: `getReviewsByGame(gameId)`, `postReview({game_id, user_id, user_name, rating, comment, utm_source})`, `getReviewStats()` (1 consulta, agregado en cliente → `{[game_id]: {avg, count}}`), `getAverageRating(gameId)` (no se usa)
- Conversiones: `insertConversionEvent(row)` (sin `.select()`: no hay SELECT público), `getCurrentUserId()`
- Auth: `signUp({email,password,displayName,utmSource})` (guarda `display_name` y `utm_source` en metadata), `signIn`, `signOut`
- Perfil/dev: `getProfile(userId)`, `getMyVerification(userId)`, `submitVerification(userId, fields)` (upsert `onConflict: user_id`, status `pending`)

Esquema real en la BD (public):
- `games`: id uuid PK, title, description, genre, developer_name, image_url (placeholders, ya no se usa), status ('beta'|'released', default beta), created_at, cover_url, platform, download_size, version
- `reviews`: id, game_id → games (cascade), user_name, rating 1–5, comment, created_at, **user_id uuid nullable → auth.users**, utm_source
- `profiles`: id → auth.users PK, display_name, created_at, utm_source. Se crea por trigger `on_auth_user_created` → `handle_new_user()` (copia `display_name` y `utm_source` de raw_user_meta_data)
- `conversion_events`: id uuid PK, event (CHECK: sign_up|submit_review|download_click|play_click), game_id → games (set null), user_id → auth.users (set null), utm_source/medium/campaign (≤100), created_at (indexado)
- `developer_verifications`: user_id PK → auth.users, type ('independent'|'company'), legal_name, website, portfolio_url, tax_id, status ('pending'|'approved'|'rejected'), created_at

RLS (todas habilitadas):
- games: SELECT público. Sin políticas de escritura (los juegos se cargan a mano en el dashboard).
- reviews: SELECT público; INSERT si `user_id IS NULL OR user_id = auth.uid()`.
- profiles: SELECT solo el propio.
- developer_verifications: SELECT/INSERT propio (status='pending'); UPDATE propio si no está `approved` y deja `pending`. La aprobación es manual (dashboard).
- conversion_events: INSERT a anon/authenticated si `user_id IS NULL OR user_id = auth.uid()`. Sin SELECT (no existe rol admin): se lee solo desde dashboard/service_role.

`supabase_setup.sql` NO incluye profiles, developer_verifications, reviews.user_id, el trigger ni las políticas nuevas; lo del embudo está en `supabase_funnel.sql`. Si cambias esquema, actualiza ese SQL, este archivo y los consumidores.

## 5. Flujos clave

**Auth** (`AuthContext.jsx`): `getSession()` + `onAuthStateChange`; al haber `user.id` carga `profile` y `verification` en paralelo (errores → null). `displayName = profile.display_name || prefijo del email`. `loading` = sesión no verificada o datos del usuario aún no cargados. `refresh()` recarga tras enviar verificación.

**Catálogo** (`Catalog.jsx`): `Promise.all([getGames(), getReviewStats().catch(() => ({}))])` al montar → géneros derivados con `new Set(...)` + "Todos" → filtro 100% en cliente (`activeGenre`). Estados: skeletons (6), error con "Reintentar", vacío, contador. Sin reseñas: "Sin reseñas aún, sé el primero". "▶ Jugar" → `trackConversion('play_click')` + navigate a `/juego/:id`.

**Detalle** (`GameDetail.jsx`): `Promise.all([getGameById, getReviewsByGame])`; promedio y distribución 5★→1★ en cliente; reseña nueva se antepone sin re-fetch. "⬇ Descargar juego" no descarga: muestra "La descarga estará disponible pronto." + `trackConversion('download_click')`.

**Campaña / UTM**: `App` llama `captureUtm()` como inicializador de `useState` (una vez). Guarda utm_source/medium/campaign/content en sessionStorage `d4g_utm`; sin UTM ni nada guardado → `{utm_source:'direct'}`; nunca pisa un UTM con 'direct'. `CampaignBanner` recibe `utm.utm_source`; al cerrarlo se guarda `d4g_banner_closed`.

**Conversiones** (`utils/track.js`): `trackConversion(event, extra)` inserta en `conversion_events` con UTM + user_id de sesión y llama `window.gtag` si existe; nunca lanza (try/catch + console.warn). Puntos: `play_click` (Catalog), `download_click` (GameDetail), `submit_review` (ReviewForm; además guarda `utm_source` en la reseña), `sign_up` (Login tras `signUp`; cuenta el envío aunque falte confirmar el correo).

**Reseñas** (`ReviewForm.jsx`):
- Autenticado: "Publicarás como {displayName}", envía `user_id = user.id`, `user_name = displayName`.
- Anónimo: nombre opcional (máx 50); vacío → `Anonimo####` aleatorio; `user_id = null`.
- Estrellas: 5 `<button>` con hover (`hovered || rating`), `aria-label`, `aria-pressed`; sin estrellas → "Elige de 1 a 5 estrellas para publicar."; comentario requerido (máx 500, contador).
- Éxito: confirmación persistente + callback `onReviewPosted`; sin sesión, botón "Crear cuenta para guardar mis reseñas" → `/login?mode=register`.

**Analítica**: embudo propio en `conversion_events` (ver arriba). NO hay snippet de GA4/gtag/GTM cargado; `trackConversion` llamará a `gtag` en cuanto se agregue.

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
- No hay componente Modal.

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
- Cargar GA4 (gtag) en `index.html`; eventos faltantes: `view_item`, `select_content` (filtro), `login`, CTA de Landing. Lectura de `conversion_events` solo por dashboard (no hay rol admin); inserts anónimos sin rate limit.
- Publicación de juegos por desarrolladores verificados (no hay tabla/política de escritura ni UI).
- Panel admin para aprobar verificaciones y moderar reseñas.
- `getAverageRating` quedó redundante (lo reemplaza `getReviewStats`): eliminarlo. `getReviewStats` trae todas las filas de reviews; con más volumen, pasar a vista/RPC agregada.
- Búsqueda por texto / orden en catálogo; paginación.
- Ruta 404; `index.html` con `lang="en"` y `<title>dev4gaming</title>` genéricos; sin meta SEO/OG.
- Badge "3 juegos disponibles" hardcodeado en Landing.
- `supabase_setup.sql` y README (plantilla Vite) desactualizados.
- RLS de reviews permite `user_id NULL` con cualquier `user_name` (suplantación de nombres); sin rate limit.
