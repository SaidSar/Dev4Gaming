-- ============================================================
--  Dev4Gaming — SQL Setup para Supabase
--  Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── TABLA: games ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  genre          TEXT,
  developer_name TEXT,
  image_url      TEXT,
  status         TEXT DEFAULT 'beta' CHECK (status IN ('beta', 'released')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLA: reviews ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
-- Lectura pública, escritura pública (MVP sin auth)

ALTER TABLE games   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "games: lectura pública"
  ON games FOR SELECT USING (true);

CREATE POLICY "reviews: lectura pública"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews: escritura pública"
  ON reviews FOR INSERT WITH CHECK (true);

-- ─── DATOS DE PRUEBA ────────────────────────────────────────

INSERT INTO games (title, description, genre, developer_name, image_url, status) VALUES
  (
    'Void Runner',
    'Un runner espacial con mecánicas de gravedad inversa. Esquiva asteroides y recoge energía.',
    'Runner',
    'NovaByte Studios',
    'https://placehold.co/400x220/0a0a0f/00BFFF?text=Void+Runner',
    'beta'
  ),
  (
    'Shadow Forge',
    'RPG de construcción donde tus sombras son tus aliados. Crafting y exploración en un mundo oscuro.',
    'RPG',
    'DarkCraft Dev',
    'https://placehold.co/400x220/0a0a0f/7B2FBE?text=Shadow+Forge',
    'beta'
  ),
  (
    'Pixel Siege',
    'Tower defense con estética pixel art y jefes de fin de nivel únicos.',
    'Tower Defense',
    'RetroWave Games',
    'https://placehold.co/400x220/0a0a0f/00BFFF?text=Pixel+Siege',
    'beta'
  );
