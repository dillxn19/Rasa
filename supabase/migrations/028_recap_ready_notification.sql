-- ============================================================
-- MIGRATION 028: monthly "your Rasa Wrapped is ready" notification
-- ============================================================
-- On the 1st of each month, notify every unlocked user who actually rated
-- something last month that their recap is ready. The notify_push trigger
-- (migration 027) fans each row out to an Expo push automatically.
-- Requires pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION notify_recap_ready()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT u.id,
         'milestone',
         'Your Rasa Wrapped is ready! ✨',
         'See your month in food — top spots, cuisines and stats.',
         jsonb_build_object('kind', 'recap')
    FROM users u
   WHERE u.is_active = true
     AND COALESCE(u.total_reviews, 0) >= 10            -- recap is unlocked at 10 ranked places
     AND EXISTS (                                      -- and they actually rated last month
       SELECT 1 FROM reviews r
        WHERE r.user_id = u.id
          AND r.created_at >= date_trunc('month', now() - interval '1 month')
          AND r.created_at <  date_trunc('month', now())
     )
     AND NOT EXISTS (                                  -- idempotent within the month
       SELECT 1 FROM notifications n
        WHERE n.user_id = u.id
          AND n.data->>'kind' = 'recap'
          AND n.created_at >= date_trunc('month', now())
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 01:00 UTC on the 1st (= 09:00 Malaysia). Named schedule → re-running replaces.
SELECT cron.schedule('recap-ready-monthly', '0 1 1 * *', $$SELECT notify_recap_ready()$$);
