-- ============================================================
-- MIGRATION 027: fan out every notification row to an Expo push
-- ============================================================
-- Follows / likes / comments / milestones already INSERT into `notifications`
-- (migration 002). This adds an AFTER INSERT trigger that POSTs each new row to
-- the `send-push` edge function via pg_net, so the recipient also gets a push.
--
-- The function's shared secret + URL live in a server-only `push_config` table
-- (RLS on, no policies → unreadable by clients; the trigger is SECURITY DEFINER).
-- The secret is inserted OUT OF BAND (not in this migration / git). See the
-- companion INSERT run via the Management API.
-- Requires the pg_net extension (enabled alongside this migration).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS push_config (
  id            INT PRIMARY KEY DEFAULT 1,
  function_url  TEXT NOT NULL,
  secret        TEXT NOT NULL,
  CONSTRAINT push_config_singleton CHECK (id = 1)
);
ALTER TABLE push_config ENABLE ROW LEVEL SECURITY;  -- no policies → server-only

CREATE OR REPLACE FUNCTION notify_push()
RETURNS TRIGGER AS $$
DECLARE
  cfg push_config%ROWTYPE;
BEGIN
  SELECT * INTO cfg FROM push_config WHERE id = 1;
  IF cfg.function_url IS NULL THEN
    RETURN NEW; -- not configured yet → no-op
  END IF;

  PERFORM net.http_post(
    url     := cfg.function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret),
    body    := jsonb_build_object(
      'userIds', jsonb_build_array(NEW.user_id),
      'title',   NEW.title,
      'body',    NEW.body,
      'data',    COALESCE(NEW.data, '{}'::jsonb)
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never let a push failure block the notification insert
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_push ON notifications;
CREATE TRIGGER trg_notify_push
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_push();
