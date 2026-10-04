# Dev4Gaming — Contexto del proyecto

Este documento describe el estado actual del proyecto para asistentes de código, incluido Claude Chat/Claude Code. Es una guía basada en el código presente; cuando algo aquí y el código difieran, verifica el código antes de cambiarlo y actualiza este documento si la arquitectura cambia.

## 1. Resumen

Dev4Gaming es una aplicación web para descubrir juegos indie y recopilar reseñas de jugadores, con énfasis en títulos en beta. La interfaz permite consultar un catálogo, abrir la ficha de un juego y publicar comentarios con una calificación de 1 a 5 estrellas.

La aplicación es un MVP en español. El frontend está implementado; los datos persistentes se leen y escriben en Supabase. No hay autenticación ni área de administración implementadas.

## 2. Tecnologías

- React 19 con componentes funcionales y hooks.
- Vite 8 como servidor de desarrollo y bundler.
- React Router DOM 7 para navegación del lado del cliente.
- Supabase JavaScript Client 2 para consultar Postgres.
- CSS propio, organizado por página/componente; no hay framework CSS.
- JavaScript con módulos ES; el proyecto no usa TypeScript.
- Oxlint para lint.

## 3. Estructura

```text
.
├── index.html                   # Documento HTML y punto de montaje
├── package.json                 # Dependencias y scripts npm
├── vite.config.js               # Configuración de Vite y plugin React
├── supabase_setup.sql           # Esquema, políticas RLS y datos de ejemplo
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx                 # Monta React dentro de #root
    ├── App.jsx                  # Router y rutas principales
    ├── services/
    │   └── supabase.js          # Cliente Supabase y operaciones de datos
    ├── components/
    │   ├── Navbar.jsx
    │   ├── GameCard.jsx
    │   ├── ReviewForm.jsx
    │   └── ReviewList.jsx
    ├── pages/
    │   ├── Landing.jsx
    │   ├── Catalog.jsx
    │   └── GameDetail.jsx
    ├── styles/
    │   ├── global.css
    │   ├── landing.css
    │   ├── navbar.css
    │   ├── catalog.css
    │   ├── gameCard.css
    │   ├── gameDetail.css
    │   └── reviewForm.css
    └── assets/
        ├── hero.png
        └── vite.svg
```

`node_modules/` y `dist/` son artefactos locales/generados, no código fuente que normalmente deba editarse.

## 4. Rutas y comportamiento de la interfaz

Las rutas se declaran en `src/App.jsx`:

| Ruta | Página | Comportamiento |
|---|---|---|
| `/` | Landing | Presentación y enlaces al catálogo. |
| `/games` | Catálogo | Obtiene juegos de Supabase, permite filtrar por género y muestra estados de carga/error/vacío. |
| `/games/:id` | Detalle | Obtiene un juego y sus reseñas; muestra formulario, calificación media y lista de reseñas. |

La barra superior (`Navbar`) es global. En pantallas pequeñas muestra un menú hamburguesa. Los textos visibles y mensajes de interfaz están principalmente en español.

### Flujo de datos

1. `Catalog` llama `getGames()` al montarse; filtra los resultados en el cliente por `genre`.
2. Cada `GameCard` enlaza a `/games/:id`.
3. `GameDetail` obtiene el juego y las reseñas en paralelo mediante `getGameById(id)` y `getReviewsByGame(id)`.
4. `ReviewForm` valida nombre, puntuación y comentario en cliente, luego llama `postReview(...)`.
5. Cuando Supabase confirma la inserción, el detalle agrega la reseña al estado local sin volver a consultar.
6. La media de estrellas del detalle se calcula a partir de las reseñas cargadas en memoria.

## 5. Datos y Supabase

El cliente y las funciones de acceso a datos están en `src/services/supabase.js`. Las variables de entorno requeridas son:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Configúralas en un archivo `.env` local en la raíz. `.env` está ignorado por Git; no incluyas sus valores en documentación, logs, commits ni respuestas. Las variables `VITE_*` llegan al bundle del navegador, por lo que la clave anon no debe tratarse como un secreto: los permisos deben estar protegidos mediante RLS. Nunca pongas una clave `service_role` en el frontend.

### Tabla `games`

Creada por `supabase_setup.sql`:

| Columna | Tipo / regla | Uso |
|---|---|---|
| `id` | UUID, PK, default `gen_random_uuid()` | Identificador de ruta. |
| `title` | TEXT, requerido | Título mostrado. |
| `description` | TEXT, opcional | Descripción en detalle. |
| `genre` | TEXT, opcional | Filtro del catálogo. |
| `developer_name` | TEXT, opcional | Nombre del desarrollador. |
| `image_url` | TEXT, opcional | URL de portada/banner. |
| `status` | TEXT, default `beta`, restringido a `beta` o `released` | Badge de estado. |
| `created_at` | TIMESTAMPTZ, default `NOW()` | Orden descendente en catálogo. |

### Tabla `reviews`

| Columna | Tipo / regla | Uso |
|---|---|---|
| `id` | UUID, PK, default `gen_random_uuid()` | Clave de la reseña. |
| `game_id` | UUID, FK a `games.id`, `ON DELETE CASCADE` | Juego reseñado. |
| `user_name` | TEXT, requerido | Nombre ingresado por el usuario. |
| `rating` | INTEGER, requerido, entre 1 y 5 | Calificación. |
| `comment` | TEXT, opcional en base de datos | Texto de reseña. |
| `created_at` | TIMESTAMPTZ, default `NOW()` | Fecha y orden de visualización. |

El formulario impone además nombre y comentario no vacíos y límites de 50 y 500 caracteres respectivamente.

### Políticas presentes en el SQL

- RLS está habilitado en ambas tablas.
- `games`: política de lectura pública (`SELECT`).
- `reviews`: lectura pública (`SELECT`) e inserción pública (`INSERT`).
- El script no define políticas de escritura para juegos.
- No hay autenticación, límites de frecuencia ni moderación de reseñas en la implementación actual.

`supabase_setup.sql` también inserta tres juegos de demostración (Void Runner, Shadow Forge y Pixel Siege). La creación de tablas usa `IF NOT EXISTS`, pero las políticas e inserciones de ejemplo no están diseñadas como una migración completamente repetible; comprueba el estado de Supabase antes de ejecutarlo otra vez.

## 6. Desarrollo y validación

Requiere Node.js y npm compatibles con las versiones actuales de Vite del proyecto, dependencias instaladas y variables de Supabase configuradas.

```bash
npm install
npm run dev
```

Scripts disponibles:

```bash
npm run dev      # Servidor local de Vite
npm run build    # Build de producción en dist/
npm run preview  # Sirve localmente el build
npm run lint     # Ejecuta Oxlint
```

No hay script de pruebas ni suite de tests configurada actualmente en `package.json`.

## 7. Convenciones al modificar

- Mantén componentes funcionales y hooks de React; no introduzcas otra arquitectura sin necesidad.
- Conserva la separación actual: páginas orquestan estado/datos, componentes presentan UI reutilizable y `services/supabase.js` centraliza consultas.
- Reutiliza el cliente y las funciones Supabase existentes; ante una nueva consulta, añade una función de servicio en ese módulo o extrae un servicio si el alcance lo justifica.
- Comprueba el resultado de cada operación Supabase y propaga errores; las funciones actuales lanzan `error` cuando Supabase devuelve uno.
- Usa clases BEM con prefijo del componente o página (`game-card__...`, `catalog__...`) y coloca los estilos en el CSS correspondiente.
- Usa las variables CSS globales de `src/styles/global.css` para colores, tipografía, espacios y radios antes de añadir valores globales nuevos.
- Mantén el diseño responsive y contempla estados de carga, error y contenido vacío en las vistas con datos remotos.
- Mantén etiquetas, mensajes y contenido de interfaz en español salvo que el producto solicite otro idioma.
- No agregues secretos, claves `service_role` o valores reales de `.env` al código o al Markdown.
- Si cambias columnas, restricciones o políticas, actualiza coordinadamente `supabase_setup.sql`, las consultas/consumidores del frontend y este contexto.

## 8. Límites y detalles que conviene tener presentes

- El CTA “Soy desarrollador” de la landing actualmente lleva al catálogo, igual que el CTA de jugadores; no existe aún un flujo para publicar juegos.
- El catálogo no consulta reseñas para poblar `rating` en `GameCard`; el componente acepta esa prop, pero el servicio `getGames()` solo obtiene filas de `games`.
- La calificación media visible en el detalle se deriva de las reseñas que la página ha cargado; `getAverageRating()` existe en el servicio pero no está conectado a esa pantalla.
- Las rutas no incluyen una página catch-all personalizada.
- El título y `lang` del HTML base (`index.html`) todavía son los valores genéricos iniciales (`dev4gaming` y `en`).
- Los juegos de ejemplo utilizan imágenes externas de `placehold.co`.
- La configuración de Vite es mínima; no hay backend propio ni API server dentro del repositorio.

## 9. Guía breve para Claude

Antes de implementar un cambio:

1. Lee los archivos implicados y busca usos de los componentes/funciones para mantener coherencia.
2. Distingue el comportamiento actual de una funcionalidad propuesta; no supongas que algo descrito como idea ya existe.
3. Para cambios de datos, revisa RLS y el esquema SQL además del frontend.
4. Haz cambios acotados, conserva el idioma/diseño actual y no añadas dependencias si no son necesarias.
5. Ejecuta como mínimo `npm run lint` y `npm run build` para cambios de código. Para cambios exclusivamente documentales, no hace falta build.
6. Actualiza este archivo cuando cambie de forma significativa el flujo, las rutas, el esquema, las variables requeridas o los comandos.
