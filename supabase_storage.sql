-- ============================================================
--  Dev4Gaming — Storage privado para builds y capturas (paso 2)
--  Ejecutar en: Supabase Dashboard > SQL Editor (o como migración)
--  Requiere: supabase_builds.sql aplicado.
--  Aditiva e idempotente: si un bucket ya existe no se modifica.
-- ============================================================

-- ─── 1. Buckets (privados) ──────────────────────────────────
-- builds:          {game_id}/{version}/{platform}/{archivo}.apk|.zip
--                  50 MB = límite por archivo del plan Free.
-- bug-screenshots: {game_id}/{user_id}/{archivo}.png|.jpg|.webp, 5 MB

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('builds', 'builds', false, 52428800,
   ARRAY['application/vnd.android.package-archive', 'application/zip',
         'application/x-zip-compressed', 'application/octet-stream']),
  ('bug-screenshots', 'bug-screenshots', false, 5242880,
   ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Políticas de storage.objects ────────────────────────
-- Los jugadores NO tienen SELECT en "builds": solo descargan con la URL
-- firmada que entrega la Edge Function get-download-url (que además
-- registra la descarga). Sin DELETE: las versiones se archivan.

DO $$
BEGIN
  -- builds: el dev verificado sube a la carpeta de un juego suyo
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'builds: subir (dev dueño)') THEN
    CREATE POLICY "builds: subir (dev dueño)" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'builds'
        AND lower(storage.extension(name)) IN ('apk', 'zip')
        AND public.is_verified_dev()
        AND EXISTS (SELECT 1 FROM public.games g
                     WHERE g.id::text = (storage.foldername(name))[1]
                       AND g.owner_id = auth.uid())
      );
  END IF;
  -- builds: el dueño ve y reanuda (TUS) sus propios archivos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'builds: leer propios (dev dueño)') THEN
    CREATE POLICY "builds: leer propios (dev dueño)" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'builds'
        AND EXISTS (SELECT 1 FROM public.games g
                     WHERE g.id::text = (storage.foldername(name))[1]
                       AND g.owner_id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'builds: reemplazar propios (dev dueño)') THEN
    CREATE POLICY "builds: reemplazar propios (dev dueño)" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'builds'
        AND public.is_verified_dev()
        AND EXISTS (SELECT 1 FROM public.games g
                     WHERE g.id::text = (storage.foldername(name))[1]
                       AND g.owner_id = auth.uid())
      )
      WITH CHECK (
        bucket_id = 'builds'
        AND lower(storage.extension(name)) IN ('apk', 'zip')
        AND public.is_verified_dev()
        AND EXISTS (SELECT 1 FROM public.games g
                     WHERE g.id::text = (storage.foldername(name))[1]
                       AND g.owner_id = auth.uid())
      );
  END IF;

  -- bug-screenshots: cada usuario sube a {game_id}/{su user_id}/
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'bug-screenshots: subir la propia') THEN
    CREATE POLICY "bug-screenshots: subir la propia" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'bug-screenshots'
        AND (storage.foldername(name))[2] = auth.uid()::text
        AND lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
      );
  END IF;
  -- bug-screenshots: las ve quien la subió y el dev dueño del juego
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'bug-screenshots: leer propias o de mis juegos') THEN
    CREATE POLICY "bug-screenshots: leer propias o de mis juegos" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'bug-screenshots'
        AND ((storage.foldername(name))[2] = auth.uid()::text
             OR EXISTS (SELECT 1 FROM public.games g
                         WHERE g.id::text = (storage.foldername(name))[1]
                           AND g.owner_id = auth.uid()))
      );
  END IF;
END $$;
