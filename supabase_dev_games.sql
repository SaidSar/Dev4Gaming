-- ============================================================
--  Dev4Gaming — Juegos creados por devs, visibilidad y portadas
--  Ejecutar en: Supabase Dashboard > SQL Editor (o como migración)
--  Requiere: supabase_builds.sql y supabase_storage.sql aplicados.
--  Aditiva e idempotente: los 3 juegos de ejemplo no cambian
--  (is_listed = true por default y no tienen owner_id).
-- ============================================================

-- ─── 1. Visibilidad en el catálogo ──────────────────────────
-- is_listed = aparece en el catálogo y en los conteos de la home.
-- Juegos con dueño: se listan solo si tienen ≥ 1 build publicado
-- (lo mantienen los triggers de abajo). Juegos sin dueño (los de
-- ejemplo, cargados a mano): quedan como estén.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS games_is_listed_idx ON public.games (is_listed);

-- Al crear un juego con dueño nace oculto (no puede tener builds aún).
-- Así un dev no puede insertarlo ya listado.
CREATE OR REPLACE FUNCTION public.games_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
begin
  if new.owner_id is not null then
    new.is_listed := false;
  end if;
  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'games_before_insert') THEN
    CREATE TRIGGER games_before_insert
      BEFORE INSERT ON public.games
      FOR EACH ROW EXECUTE FUNCTION public.games_before_insert();
  END IF;
END $$;

-- Cuando cambia un build, recalcula si su juego (con dueño) se lista.
-- SECURITY DEFINER: el dev no tiene UPDATE sobre games.
CREATE OR REPLACE FUNCTION public.refresh_game_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
begin
  update public.games g
     set is_listed = exists (
           select 1 from public.builds b
            where b.game_id = g.id and b.status = 'published')
   where g.id = new.game_id
     and g.owner_id is not null;
  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'builds_refresh_game_listing') THEN
    CREATE TRIGGER builds_refresh_game_listing
      AFTER INSERT OR UPDATE OF status ON public.builds
      FOR EACH ROW EXECUTE FUNCTION public.refresh_game_listing();
  END IF;
END $$;

-- Backfill: juegos con dueño que ya existían (p. ej. el de la cuenta QA)
UPDATE public.games g
   SET is_listed = EXISTS (SELECT 1 FROM public.builds b
                            WHERE b.game_id = g.id AND b.status = 'published')
 WHERE g.owner_id IS NOT NULL;

-- ─── 2. RLS: un dev verificado crea sus juegos ──────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'games: crear (dev verificado)') THEN
    CREATE POLICY "games: crear (dev verificado)" ON public.games
      FOR INSERT TO authenticated
      WITH CHECK (owner_id = auth.uid() AND public.is_verified_dev());
  END IF;
END $$;
-- Sin UPDATE/DELETE para devs (por ahora): editar o borrar un juego
-- se hace desde el dashboard. SELECT sigue público: un juego oculto
-- no sale en el catálogo, pero su ficha abre por URL (vista previa).

-- ─── 3. Portadas ────────────────────────────────────────────
-- Bucket PÚBLICO de solo imágenes: las portadas se muestran a todos
-- en el catálogo. (Los builds siguen en el bucket privado `builds`.)
-- Ruta: {user_id}/{archivo}. Sube solo un dev verificado a su carpeta.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('game-covers', 'game-covers', true, 5242880,
        ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'game-covers: subir (dev verificado)') THEN
    CREATE POLICY "game-covers: subir (dev verificado)" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'game-covers'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
        AND public.is_verified_dev()
      );
  END IF;
END $$;

-- ─── 4. Permisos de funciones de trigger ────────────────────
REVOKE EXECUTE ON FUNCTION public.games_before_insert(), public.refresh_game_listing()
  FROM PUBLIC, anon, authenticated;
