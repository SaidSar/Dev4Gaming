-- ============================================================
--  Dev4Gaming — Juegos académicos (PLANTILLA, NO aplicada)
--  Completa cada TODO y ejecútalo en Supabase > SQL Editor.
--  Se agregan JUNTO a los 3 juegos de ejemplo (no los toca).
--  Requiere: supabase_builds.sql aplicado.
--
--  Antes de publicar: confirma los derechos del equipo, licencias de
--  assets de terceros y permiso por escrito de tus compañeros.
-- ============================================================

-- ─── 1. Juegos ──────────────────────────────────────────────
-- Borra los bloques que no uses (puedes cargar de 1 a 3 juegos).
-- owner_id: el correo con el que te registraste en Dev4Gaming; ese
-- usuario debe estar verificado como dev para subir builds.

INSERT INTO public.games
  (title, description, genre, developer_name, status, cover_url, is_academic, credits, owner_id)
VALUES
  ('TODO título del juego 1',
   'TODO descripción corta del juego 1',
   'TODO género',
   'TODO nombre del equipo',
   'beta',
   NULL,                                   -- TODO ruta en /public/covers o URL https (opcional)
   true,
   'TODO créditos: Nombre (rol), Nombre (rol) — Materia, UAdeO 2026',
   (SELECT id FROM auth.users WHERE email = 'TODO-tu-correo@ejemplo.com'))
  -- ,('TODO título del juego 2', 'TODO descripción', 'TODO género', 'TODO equipo', 'beta', NULL, true,
  --   'TODO créditos', (SELECT id FROM auth.users WHERE email = 'TODO-tu-correo@ejemplo.com'))
  -- ,('TODO título del juego 3', 'TODO descripción', 'TODO género', 'TODO equipo', 'beta', NULL, true,
  --   'TODO créditos', (SELECT id FROM auth.users WHERE email = 'TODO-tu-correo@ejemplo.com'))
;

-- ─── 2. Builds (opcional) ───────────────────────────────────
-- Lo normal es subirlos desde /dev/dashboard (paso 5): calcula el
-- SHA-256 y sube el archivo al bucket. Para un build WEB (itch.io o
-- GitHub Pages) también puedes registrarlo aquí directamente:
--
-- INSERT INTO public.builds (game_id, version, platform, storage_provider,
--                            web_entry_url, changelog, test_focus, status)
-- VALUES (
--   (SELECT id FROM public.games WHERE title = 'TODO título del juego 1'),
--   '0.1.0-beta', 'web', 'external',
--   'https://TODO-usuario.itch.io/TODO-juego',        -- o https://TODO.github.io/TODO/
--   'TODO qué cambió en esta versión',
--   'TODO qué quieres que prueben los testers',
--   'published'
-- );
