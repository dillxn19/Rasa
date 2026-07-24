// Receives a waitlist signup from the marketing site and emails it to the
// founder via Resend. Same secrets as job-application (RESEND_API_KEY etc.).
// Deploy with --no-verify-jwt so the public site can POST.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const NOTIFY_EMAIL = Deno.env.get('JOBS_NOTIFY_EMAIL') ?? 'kathleenpzapata@gmail.com';
const FROM = Deno.env.get('JOBS_FROM_EMAIL') ?? 'Rasa <onboarding@resend.dev>';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const a = await req.json();
    const name = String(a.name ?? '').trim();
    const email = String(a.email ?? '').trim().toLowerCase();
    if (!name || !email) return json({ error: 'name and email are required' }, 400);

    // Persist so it shows in the admin dashboard (service role bypasses RLS).
    // Ignore duplicate emails so re-signups don't error.
    try {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await sb.from('waitlist').upsert(
        { name, email, phone: String(a.phone ?? '').trim() || null, referral: String(a.referral ?? '').trim() || null },
        { onConflict: 'email', ignoreDuplicates: true },
      );
    } catch (_) { /* best-effort — still email below */ }

    const rows: [string, string][] = [
      ['Name', name],
      ['Email', email],
      ['Phone', a.phone ?? ''],
      ['Referral code', a.referral ?? ''],
    ];
    const html =
      `<h2>New waitlist signup 🍜</h2>` +
      `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
      rows
        .filter(([, v]) => String(v).trim() !== '')
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px;color:#888"><b>${k}</b></td>` +
            `<td style="padding:6px 12px">${esc(v)}</td></tr>`,
        )
        .join('') +
      `</table>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_EMAIL],
        reply_to: email,
        subject: `New waitlist signup — ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: 'email_failed', detail }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) }, 400);
  }
});
