-- ============================================================
-- MIGRATION 023: Generic app flags + explore Google-fill toggle
-- ============================================================
-- Adds a generic boolean flag reader on the existing app_config table (from 022)
-- and seeds `explore_google_fill` = true so Explore supplements category/dish
-- browse with live Google results during early stages. Flip it off (no app
-- rebuild) once the Rasa DB is rich:
--   UPDATE app_config SET bool_value = false WHERE key = 'explore_google_fill';
-- Run in the Supabase SQL editor.

INSERT INTO app_config (key, bool_value)
VALUES ('explore_google_fill', true)
ON CONFLICT (key) DO NOTHING;

-- Generic reader: returns the flag, or the caller's default if the row is absent.
CREATE OR REPLACE FUNCTION app_flag(p_key TEXT, p_default BOOLEAN)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE((SELECT bool_value FROM app_config WHERE key = p_key), p_default);
$$;

GRANT EXECUTE ON FUNCTION app_flag(TEXT, BOOLEAN) TO anon, authenticated;
