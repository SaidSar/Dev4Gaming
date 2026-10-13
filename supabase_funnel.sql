-- ============================================================
--  Dev4Gaming — Embudo de conversión de campaña (2026-10-12)
--  Ejecutar en: Supabase Dashboard > SQL Editor (o como migración)
--  Requiere: games, reviews, profiles y handle_new_user() existentes.
-- ============================================================

-- ─── 1. Ficha del juego: portada y datos de descarga ────────

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS cover_url     TEXT,
  ADD COLUMN IF NOT EXISTS platform      TEXT,
  ADD COLUMN IF NOT EXISTS download_size TEXT,
  ADD COLUMN IF NOT EXISTS version       TEXT;

UPDATE public.games SET
  cover_url = '/covers/void-runner.svg',  platform = 'Windows · macOS',
  download_size = '180 MB', version = 'v0.4.2 beta'
WHERE title = 'Void Runner';

UPDATE public.games SET
  cover_url = '/covers/shadow-forge.svg', platform = 'Windows',
  download_size = '1.2 GB', version = 'v0.7.0 beta'
WHERE title = 'Shadow Forge';

UPDATE public.games SET
  cover_url = '/covers/pixel-siege.svg',  platform = 'Windows · Linux',
  download_size = '95 MB',  version = 'v0.3.1 beta'
WHERE title = 'Pixel Siege';

-- ─── 2. Atribución en reseñas y perfiles ───────────────────

ALTER TABLE public.reviews  ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS utm_source TEXT;

-- profiles no tiene política UPDATE: el utm_source llega en los metadatos
-- de signUp() y el trigger lo copia al crear el perfil.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, display_name, utm_source)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(left(trim(new.raw_user_meta_data->>'utm_source'), 100), '')
  );
  return new;
end;
$function$;

-- ─── 3. Eventos de conversión ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversion_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event        TEXT NOT NULL
               CHECK (event IN ('sign_up', 'submit_review', 'download_click', 'play_click')),
  game_id      UUID REFERENCES public.games(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES auth.users(id)   ON DELETE SET NULL,
  utm_source   TEXT CHECK (char_length(utm_source)   <= 100),
  utm_medium   TEXT CHECK (char_length(utm_medium)   <= 100),
  utm_campaign TEXT CHECK (char_length(utm_campaign) <= 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversion_events_created_at_idx
  ON public.conversion_events (created_at DESC);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- Cualquiera registra eventos; un usuario solo puede firmar con su propio id.
CREATE POLICY "conversion_events: registrar"
  ON public.conversion_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Sin política SELECT a propósito: el proyecto no tiene rol admin,
-- así que solo se lee desde el Dashboard / service_role (igual que la
-- aprobación de desarrolladores).
