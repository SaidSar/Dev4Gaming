-- ============================================================
--  Dev4Gaming — Métricas por versión para el panel del dev (paso 5)
--  Ejecutar en: Supabase Dashboard > SQL Editor (o como migración)
--  Requiere: supabase_builds.sql aplicado.
--  Solo crea una función: aditiva e idempotente.
-- ============================================================

-- Una fila por build del juego (todas: pendientes, publicadas y archivadas).
-- Solo devuelve filas al dueño del juego (o a un admin): downloads no
-- tiene políticas para clientes, así que esta RPC es la única lectura.
--
-- download_to_review = descargadores que luego reseñaron ESE build con
-- su cuenta / descargadores únicos. Las reseñas anónimas no se pueden
-- cruzar con descargas (que siempre tienen user_id), así que no cuentan.
CREATE OR REPLACE FUNCTION public.get_build_metrics(p_game_id uuid)
RETURNS TABLE (
  build_id           uuid,
  version            text,
  platform           text,
  status             text,
  created_at         timestamptz,
  downloads          bigint,
  downloaders        bigint,
  reviews            bigint,
  avg_rating         numeric,
  bugs_low           bigint,
  bugs_medium        bigint,
  bugs_high          bigint,
  bugs_crash         bigint,
  download_to_review numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH allowed AS (
    SELECT public.owns_game(p_game_id)
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') AS ok
  ),
  dl AS (
    SELECT d.build_id, count(*) AS total, count(DISTINCT d.user_id) AS users
      FROM public.downloads d
      JOIN public.builds b ON b.id = d.build_id AND b.game_id = p_game_id
     GROUP BY d.build_id
  ),
  rv AS (
    SELECT r.build_id, count(*) AS total, round(avg(r.rating)::numeric, 2) AS avg_rating
      FROM public.reviews r
     WHERE r.game_id = p_game_id AND r.build_id IS NOT NULL
     GROUP BY r.build_id
  ),
  bg AS (
    SELECT g.build_id,
           count(*) FILTER (WHERE g.severity = 'low')    AS low,
           count(*) FILTER (WHERE g.severity = 'medium') AS medium,
           count(*) FILTER (WHERE g.severity = 'high')   AS high,
           count(*) FILTER (WHERE g.severity = 'crash')  AS crash
      FROM public.bug_reports g
     WHERE g.game_id = p_game_id AND g.build_id IS NOT NULL
     GROUP BY g.build_id
  ),
  conv AS (
    SELECT d.build_id, count(DISTINCT d.user_id) AS reviewers
      FROM public.downloads d
      JOIN public.reviews r ON r.build_id = d.build_id AND r.user_id = d.user_id
     WHERE r.game_id = p_game_id
     GROUP BY d.build_id
  )
  SELECT b.id, b.version, b.platform, b.status, b.created_at,
         coalesce(dl.total, 0), coalesce(dl.users, 0),
         coalesce(rv.total, 0), rv.avg_rating,
         coalesce(bg.low, 0), coalesce(bg.medium, 0), coalesce(bg.high, 0), coalesce(bg.crash, 0),
         CASE WHEN coalesce(dl.users, 0) = 0 THEN NULL
              ELSE round(coalesce(conv.reviewers, 0)::numeric / dl.users, 4) END
    FROM public.builds b
    CROSS JOIN allowed
    LEFT JOIN dl   ON dl.build_id   = b.id
    LEFT JOIN rv   ON rv.build_id   = b.id
    LEFT JOIN bg   ON bg.build_id   = b.id
    LEFT JOIN conv ON conv.build_id = b.id
   WHERE b.game_id = p_game_id AND allowed.ok
   ORDER BY b.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_build_metrics(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_build_metrics(uuid) TO authenticated;
