// Sends an Expo push notification to one or more Rasa users.
//
// This is the SERVER SEND PATH for push. It's meant to be called with the
// service role (e.g. from a DB webhook/trigger on `notifications` INSERT, or
// another edge function) — NOT directly from the app. Protect it with a shared
// secret so it can't be invoked by anyone with the anon key.
//
//   Deploy:  supabase functions deploy send-push --no-verify-jwt --project-ref <ref>
//   Secret:  supabase secrets set PUSH_FN_SECRET=<random-long-string>
//   Call:    POST { userIds: string[], title, body, data? }  header x-push-secret: <PUSH_FN_SECRET>
//
// NOTE: untested end-to-end until a dev/production build exists to mint real
// Expo push tokens (Expo Go / simulators don't produce them). The registration
// side lives in src/lib/push.ts.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Shared-secret gate.
    const secret = Deno.env.get('PUSH_FN_SECRET');
    if (!secret || req.headers.get('x-push-secret') !== secret) {
      return json({ error: 'unauthorized' }, 401);
    }

    const a = await req.json();
    const userIds: string[] = Array.isArray(a.userIds)
      ? a.userIds
      : a.userId ? [a.userId] : [];
    const title = String(a.title ?? '').trim();
    const body = String(a.body ?? '').trim();
    const data = a.data ?? {};
    if (!userIds.length || !title) return json({ error: 'userIds and title are required' }, 400);

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Look up push tokens (service role bypasses RLS).
    const { data: rows } = await sb
      .from('users')
      .select('id, push_token')
      .in('id', userIds)
      .not('push_token', 'is', null);

    const messages = (rows ?? [])
      .filter((r) => typeof r.push_token === 'string' && r.push_token.startsWith('ExponentPushToken'))
      .map((r) => ({ to: r.push_token, sound: 'default', title, body, data }));

    if (!messages.length) return json({ ok: true, sent: 0, note: 'no valid push tokens' });

    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await resp.json();

    return json({ ok: true, sent: messages.length, result });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
