-- Respaldo en Supabase de los eventos del hero (Reel de la portada).
-- Amplía el CHECK de conversion_events.event con 'hero_video_play' y
-- 'hero_cta_click'. No cambia columnas, RLS ni datos: las filas existentes
-- ya cumplen la lista nueva, así que la validación no puede fallar.
-- ⚠ Aplicar ANTES de desplegar el frontend que manda estos eventos; sin
-- ella esos inserts fallan (trackConversion lo atrapa con console.warn).

BEGIN;

ALTER TABLE public.conversion_events
  DROP CONSTRAINT IF EXISTS conversion_events_event_check;

ALTER TABLE public.conversion_events
  ADD CONSTRAINT conversion_events_event_check
  CHECK (event IN (
    'sign_up', 'submit_review', 'download_click', 'play_click',
    'hero_video_play', 'hero_cta_click'
  ));

COMMIT;

-- Rollback (solo si no hay filas con los eventos nuevos):
-- ALTER TABLE public.conversion_events DROP CONSTRAINT conversion_events_event_check;
-- ALTER TABLE public.conversion_events ADD CONSTRAINT conversion_events_event_check
--   CHECK (event IN ('sign_up', 'submit_review', 'download_click', 'play_click'));
