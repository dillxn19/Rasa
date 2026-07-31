-- ============================================================
-- MIGRATION 030: scheduled engagement notifications
-- ============================================================
-- Two pg_cron jobs that INSERT notification rows (auto-pushed by the 027
-- trigger): a streak-about-to-break reminder and a weekly leaderboard result.
-- Requires pg_cron (already enabled in 028).

-- ── Streak about to break ──────────────────────────────────────────────────
-- The weekly streak breaks at 7 days idle; nudge on day 6 (one day left).
CREATE OR REPLACE FUNCTION notify_streak_expiring()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT fp.user_id,
         'milestone',
         'Your streak is about to break! 🔥',
         'Rate a place today to keep your ' || fp.streak_days || '-week streak alive.',
         jsonb_build_object('kind', 'streak_expiring')
    FROM food_passports fp
    JOIN users u ON u.id = fp.user_id AND u.is_active = true
   WHERE COALESCE(fp.streak_days, 0) > 0
     AND fp.last_activity_date IS NOT NULL
     AND (CURRENT_DATE - fp.last_activity_date) = 6
     AND NOT EXISTS (
       SELECT 1 FROM notifications n
        WHERE n.user_id = fp.user_id
          AND n.data->>'kind' = 'streak_expiring'
          AND n.created_at::date = CURRENT_DATE
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Weekly leaderboard result (top 3 per city) ─────────────────────────────
CREATE OR REPLACE FUNCTION notify_weekly_leaderboard()
RETURNS void AS $$
BEGIN
  WITH weekly AS (
    SELECT rest.city AS city,
           r.user_id,
           count(*) AS cnt,
           row_number() OVER (PARTITION BY rest.city ORDER BY count(*) DESC) AS rnk
      FROM reviews r
      JOIN restaurants rest ON rest.id = r.restaurant_id
     WHERE r.is_public = true
       AND r.created_at >= (CURRENT_DATE - interval '7 days')
       AND rest.city IS NOT NULL
     GROUP BY rest.city, r.user_id
  )
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT w.user_id,
         'milestone',
         CASE w.rnk
           WHEN 1 THEN '🥇 You topped ' || w.city || ' this week!'
           WHEN 2 THEN '🥈 #2 in ' || w.city || ' this week!'
           ELSE '🥉 #3 in ' || w.city || ' this week!'
         END,
         'You ranked #' || w.rnk || ' with ' || w.cnt || ' new spots. Keep it up!',
         jsonb_build_object('kind', 'weekly_leaderboard', 'city', w.city, 'rank', w.rnk)
    FROM weekly w
    JOIN users u ON u.id = w.user_id AND u.is_active = true
   WHERE w.rnk <= 3
     AND w.cnt > 0
     AND NOT EXISTS (
       SELECT 1 FROM notifications n
        WHERE n.user_id = w.user_id
          AND n.data->>'kind' = 'weekly_leaderboard'
          AND n.created_at >= (CURRENT_DATE - interval '6 days')
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Streak nudge: daily 10:00 UTC (18:00 Malaysia — evening reminder).
SELECT cron.schedule('streak-expiring-daily', '0 10 * * *', $$SELECT notify_streak_expiring()$$);
-- Weekly result: Monday 02:00 UTC (10:00 Malaysia).
SELECT cron.schedule('weekly-leaderboard', '0 2 * * 1', $$SELECT notify_weekly_leaderboard()$$);
