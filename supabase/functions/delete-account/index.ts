// Permanently delete the calling user's account (Apple guideline 5.1.1(v)).
// Deletes the auth.users row with the service role; because public.users.auth_id
// is `REFERENCES auth.users(id) ON DELETE CASCADE` and every user-owned table
// cascades from public.users, this removes the profile, reviews, follows, likes,
// comments, saves, lists, coins, referrals — the entire footprint — in one shot.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing_authorization' }, 401);

    // Identify the caller from their JWT (anon client bound to their token).
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: 'invalid_token' }, 401);

    // Delete with the service role (admin API). ON DELETE CASCADE does the rest.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error('delete-account failed', delErr);
      return json({ error: 'delete_failed' }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    console.error('delete-account exception', e);
    return json({ error: 'unexpected' }, 500);
  }
});
