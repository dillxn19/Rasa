-- ============================================================
-- MIGRATION 029: retime the recap-ready notification to the new window
-- ============================================================
-- Recap window changed to the LAST 3 DAYS of the month + first 7 of the next
-- (client getRecapWindow). The "wrapped is ready" push should arrive when the
-- window OPENS = the 3rd-to-last day of the month, recapping the CURRENT
-- (ending) month. The cron now runs daily and the function self-gates to that
-- one day (idempotent per month). Timezone: Asia/Kuala_Lumpur.

CREATE OR REPLACE FUNCTION notify_recap_ready()
RETURNS void AS $$
DECLARE
  today_my date := (timezone('Asia/Kuala_Lumpur', now()))::date;
  open_day date := (date_trunc('month', timezone('Asia/Kuala_Lumpur', now()) + interval '1 month')
                    - interval '3 days')::date;
BEGIN
  -- Only fire on the day the window opens.
  IF today_my <> open_day THEN
    RETURN;
  END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT u.id,
         'milestone',
         'Your Rasa Wrapped is ready! ✨',
         'See your month in food — top spots, cuisines and stats.',
         jsonb_build_object('kind', 'recap')
    FROM users u
   WHERE u.is_active = true
     AND COALESCE(u.total_reviews, 0) >= 10
     AND EXISTS (  -- rated during THIS (ending) month
       SELECT 1 FROM reviews r
        WHERE r.user_id = u.id
          AND r.created_at >= date_trunc('month', now())
          AND r.created_at <  date_trunc('month', now() + interval '1 month')
     )
     AND NOT EXISTS (  -- idempotent within the month
       SELECT 1 FROM notifications n
        WHERE n.user_id = u.id
          AND n.data->>'kind' = 'recap'
          AND n.created_at >= date_trunc('month', now())
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run daily; the function fires only on the window-open day.
SELECT cron.schedule('recap-ready-monthly', '0 1 * * *', $$SELECT notify_recap_ready()$$);
