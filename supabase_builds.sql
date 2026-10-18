-- ============================================================
--  Dev4Gaming — Builds reales, descargas, bugs y roles (paso 1)
--  Ejecutar en: Supabase Dashboard > SQL Editor (o como migración)
--  Requiere: supabase_setup.sql y supabase_funnel.sql aplicados.
--  100% aditiva: sin DROP/TRUNCATE; columnas nuevas nullable o con
--  default. Idempotente: se puede volver a ejecutar sin efectos.
-- ============================================================

-- ─── 1. Roles en profiles ───────────────────────────────────
-- role lo mantiene un trigger a partir de developer_verifications
-- (§4); el usuario no puede editarlo (profiles no tiene UPDATE).
-- signup_intent guarda lo que eligió al registrarse, sin dar permisos.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role          TEXT NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS signup_intent TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('player', 'dev_pending', 'dev_verified', 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_signup_intent_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_signup_intent_check
      CHECK (signup_intent IS NULL OR signup_intent IN ('player', 'developer'));
  END IF;
END $$;

-- Registro: igual que antes + signup_intent (solo 'player'|'developer').
-- No asigna role: queda el default 'player'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, display_name, utm_source, signup_intent)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(left(trim(new.raw_user_meta_data->>'utm_source'), 100), ''),
    case when new.raw_user_meta_data->>'signup_intent' in ('player', 'developer')
         then new.raw_user_meta_data->>'signup_intent' end
  );
  return new;
end;
$function$;

-- ─── 2. Juegos: académicos y dueño ──────────────────────────
-- owner_id NULL = nadie puede subir builds (los 3 de ejemplo).

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS is_academic BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits     TEXT,
  ADD COLUMN IF NOT EXISTS owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS games_owner_id_idx ON public.games (owner_id);

-- ─── 3. Builds ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.builds (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  version          TEXT NOT NULL CHECK (char_length(version) BETWEEN 1 AND 40),
  platform         TEXT NOT NULL CHECK (platform IN ('android', 'windows', 'linux', 'macos', 'web')),
  storage_provider TEXT NOT NULL DEFAULT 'supabase'
                   CHECK (storage_provider IN ('supabase', 'r2', 'external')),
  file_path        TEXT,            -- ruta en el bucket o URL externa
  web_entry_url    TEXT,            -- solo platform = 'web'
  size_bytes       BIGINT CHECK (size_bytes IS NULL OR size_bytes > 0),
  sha256           TEXT CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
  changelog        TEXT,
  test_focus       TEXT,            -- "Qué probar"
  min_requirements TEXT,
  status           TEXT NOT NULL DEFAULT 'pending_review'
                   CHECK (status IN ('pending_review', 'published', 'archived')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, version, platform),
  -- Web: se juega en iframe desde itch.io o GitHub Pages (https)
  CONSTRAINT builds_web_entry_check CHECK (
    (platform = 'web'  AND web_entry_url ~* '^https://([a-z0-9-]+\.)*(itch\.io|github\.io)(/|$)')
    OR (platform <> 'web' AND web_entry_url IS NULL)
  ),
  -- Descargables: necesitan archivo; en Supabase solo .apk/.zip y ≤ 50 MB (plan Free)
  CONSTRAINT builds_file_check CHECK (
    platform = 'web'
    OR (storage_provider = 'supabase' AND file_path ~* '\.(apk|zip)$'
        AND (size_bytes IS NULL OR size_bytes <= 52428800))
    OR (storage_provider IN ('r2', 'external') AND file_path ~* '^https://')
  )
);

CREATE INDEX IF NOT EXISTS builds_game_id_idx ON public.builds (game_id, created_at DESC);

-- ─── 4. Descargas (solo las escribe la Edge Function) ──────

CREATE TABLE IF NOT EXISTS public.downloads (
  id         BIGSERIAL PRIMARY KEY,
  build_id   UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS downloads_build_id_idx ON public.downloads (build_id);

-- ─── 5. Reportes de bugs (tabla nueva: no existía) ─────────

CREATE TABLE IF NOT EXISTS public.bug_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id            UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  build_id           UUID REFERENCES public.builds(id) ON DELETE SET NULL,
  user_id            UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  description        TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  steps_to_reproduce TEXT CHECK (char_length(steps_to_reproduce) <= 2000),
  severity           TEXT NOT NULL DEFAULT 'medium'
                     CHECK (severity IN ('low', 'medium', 'high', 'crash')),
  device_info        JSONB,
  screenshot_path    TEXT,          -- ruta en el bucket bug-screenshots
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bug_reports_game_id_idx  ON public.bug_reports (game_id);
CREATE INDEX IF NOT EXISTS bug_reports_build_id_idx ON public.bug_reports (build_id);

-- ─── 6. Reseñas ligadas al build + límite anti-spam ────────
-- Las existentes quedan con build_id NULL ("Versión no especificada").

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS build_id       UUID REFERENCES public.builds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_ip_hash TEXT;   -- HMAC con salt secreto, nunca la IP en claro

CREATE INDEX IF NOT EXISTS reviews_build_id_idx ON public.reviews (build_id);
CREATE INDEX IF NOT EXISTS reviews_ip_game_idx  ON public.reviews (client_ip_hash, game_id, created_at);

-- ─── 7. Funciones auxiliares (SECURITY DEFINER) ────────────

-- Dev verificado = solicitud aprobada (fuente de verdad) o admin
CREATE OR REPLACE FUNCTION public.is_verified_dev()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.developer_verifications
    WHERE user_id = auth.uid() AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_game(p_game_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games WHERE id = p_game_id AND owner_id = auth.uid()
  );
$$;

-- El build debe ser del mismo juego y estar publicado
CREATE OR REPLACE FUNCTION public.build_is_published_for(p_build_id uuid, p_game_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p_build_id IS NULL OR EXISTS (
    SELECT 1 FROM public.builds
    WHERE id = p_build_id AND game_id = p_game_id AND status = 'published'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_verified_dev(), public.owns_game(uuid),
  public.build_is_published_for(uuid, uuid) TO anon, authenticated;

-- ─── 8. Triggers ────────────────────────────────────────────

-- profiles.role sigue a developer_verifications (admin no se toca)
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
begin
  update public.profiles
     set role = case new.status
                  when 'approved' then 'dev_verified'
                  when 'pending'  then 'dev_pending'
                  else 'player'
                end
   where id = new.user_id and role <> 'admin';
  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_dev_verification_change') THEN
    CREATE TRIGGER on_dev_verification_change
      AFTER INSERT OR UPDATE OF status ON public.developer_verifications
      FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();
  END IF;
END $$;

-- Backfill: verificaciones que ya existían antes del trigger
UPDATE public.profiles p
   SET role = CASE v.status WHEN 'approved' THEN 'dev_verified'
                            WHEN 'pending'  THEN 'dev_pending'
                            ELSE 'player' END
  FROM public.developer_verifications v
 WHERE v.user_id = p.id AND p.role <> 'admin';

-- Salt secreto para el hash de IPs. Se genera aleatorio DENTRO de la base
-- (nunca está en el repo) en un esquema que la API no expone.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
REVOKE ALL ON private.app_secrets FROM PUBLIC, anon, authenticated;

INSERT INTO private.app_secrets (key, value)
VALUES ('review_ip_salt', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Reseñas: build válido + máx. 5 reseñas anónimas por juego, IP y 24 h
-- (el candado por sesión del navegador frena a una misma persona).
-- La IP se guarda como HMAC-SHA256 con el salt secreto, nunca en claro.
-- Si no hay cabecera (SQL Editor, dashboard), no se aplica el límite.
CREATE OR REPLACE FUNCTION public.reviews_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
  v_ip   text;
  v_salt text;
begin
  if not public.build_is_published_for(new.build_id, new.game_id) then
    raise exception 'La versión indicada no pertenece a este juego o no está publicada'
      using errcode = '23514';
  end if;

  v_ip := trim(split_part(
    coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1));
  if v_ip <> '' then
    select value into v_salt from private.app_secrets where key = 'review_ip_salt';
    new.client_ip_hash := encode(extensions.hmac(v_ip, v_salt, 'sha256'), 'hex');
    if new.user_id is null and (
      select count(*) from public.reviews
       where client_ip_hash = new.client_ip_hash
         and game_id = new.game_id
         and user_id is null
         and created_at > now() - interval '24 hours'
    ) >= 5 then
      raise exception 'Alcanzaste el límite de reseñas anónimas para este juego hoy. Inicia sesión para seguir opinando.'
        using errcode = 'P0429';
    end if;
  end if;
  return new;
end;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'reviews_before_insert') THEN
    CREATE TRIGGER reviews_before_insert
      BEFORE INSERT ON public.reviews
      FOR EACH ROW EXECUTE FUNCTION public.reviews_before_insert();
  END IF;
END $$;

-- ─── 9. RLS ─────────────────────────────────────────────────

ALTER TABLE public.builds      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- builds: todos leen los publicados; el dueño verificado ve y edita los suyos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'builds' AND policyname = 'builds: leer publicados o propios') THEN
    CREATE POLICY "builds: leer publicados o propios" ON public.builds
      FOR SELECT USING (status = 'published' OR public.owns_game(game_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'builds' AND policyname = 'builds: crear (dev dueño)') THEN
    CREATE POLICY "builds: crear (dev dueño)" ON public.builds
      FOR INSERT TO authenticated
      WITH CHECK (public.is_verified_dev() AND public.owns_game(game_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'builds' AND policyname = 'builds: editar (dev dueño)') THEN
    CREATE POLICY "builds: editar (dev dueño)" ON public.builds
      FOR UPDATE TO authenticated
      USING (public.is_verified_dev() AND public.owns_game(game_id))
      WITH CHECK (public.is_verified_dev() AND public.owns_game(game_id));
  END IF;
  -- Sin DELETE: las versiones se archivan.

  -- downloads: sin políticas para clientes. Solo escribe/lee la Edge
  -- Function (service role) y la RPC de métricas del dev.

  -- bug_reports: autenticado reporta sobre un build publicado del juego
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bug_reports' AND policyname = 'bug_reports: reportar') THEN
    CREATE POLICY "bug_reports: reportar" ON public.bug_reports
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid() AND status = 'open'
                  AND public.build_is_published_for(build_id, game_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bug_reports' AND policyname = 'bug_reports: leer propios o de mis juegos') THEN
    CREATE POLICY "bug_reports: leer propios o de mis juegos" ON public.bug_reports
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.owns_game(game_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bug_reports' AND policyname = 'bug_reports: el dev marca resuelto') THEN
    CREATE POLICY "bug_reports: el dev marca resuelto" ON public.bug_reports
      FOR UPDATE TO authenticated
      USING (public.is_verified_dev() AND public.owns_game(game_id))
      WITH CHECK (public.is_verified_dev() AND public.owns_game(game_id));
  END IF;
END $$;

-- ─── 10. Permisos de funciones ──────────────────────────────
-- Las de trigger no deben ser invocables por la API (/rest/v1/rpc).
-- is_verified_dev / owns_game / build_is_published_for SÍ conservan
-- EXECUTE: las políticas RLS se evalúan con el rol del cliente. Solo
-- revelan datos públicos o del propio usuario.
REVOKE EXECUTE ON FUNCTION public.handle_new_user(), public.sync_profile_role(),
  public.reviews_before_insert() FROM PUBLIC, anon, authenticated;
