// Receives a job application from the marketing site and emails it to the
// founder via Resend. The Resend key + recipient live as function secrets
// (never in the client). Deploy with --no-verify-jwt so the public site can POST.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
// Who gets notified. Set as a secret; falls back to the founder's address.
const NOTIFY_EMAIL = Deno.env.get('JOBS_NOTIFY_EMAIL') ?? 'kathleenpzapata@gmail.com';
// Resend requires a verified domain for the "from"; onboarding@resend.dev works
// out-of-the-box but can only deliver to the Resend account owner's email until
// you verify rasamalaysia.org. Swap to 'Rasa Jobs <jobs@rasamalaysia.org>' once verified.
const FROM = Deno.env.get('JOBS_FROM_EMAIL') ?? 'Rasa Jobs <onboarding@resend.dev>';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const a = await req.json();
    const name = String(a.name ?? '').trim();
    const email = String(a.email ?? '').trim();
    const role = String(a.role ?? 'Unknown role').trim();

    if (!name || !email) return json({ error: 'name and email are required' }, 400);

    // Persist so it shows in the admin dashboard (service role bypasses RLS).
    try {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await sb.from('job_applications').insert({
        role, name, email,
        instagram: String(a.instagram ?? '').trim() || null,
        tiktok: String(a.tiktok ?? '').trim() || null,
        university: String(a.university ?? '').trim() || null,
        portfolio: String(a.portfolio ?? '').trim() || null,
        message: String(a.message ?? '').trim() || null,
      });
    } catch (_) { /* best-effort — still email below */ }

    const rows: [string, string][] = [
      ['Role', role],
      ['Name', name],
      ['Email', email],
      ['Instagram', a.instagram ?? ''],
      ['TikTok', a.tiktok ?? ''],
      ['University', a.university ?? ''],
      ['Portfolio', a.portfolio ?? ''],
      ['Message', a.message ?? ''],
    ];
    const html =
      `<h2>New ${esc(role)} application</h2>` +
      `<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">` +
      rows
        .filter(([, v]) => String(v).trim() !== '')
        .map(
          ([k, v]) =>
            `<tr><td style="padding:6px 12px;color:#888;vertical-align:top"><b>${k}</b></td>` +
            `<td style="padding:6px 12px">${esc(v)}</td></tr>`,
        )
        .join('') +
      `</table>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_EMAIL],
        reply_to: email,
        subject: `New ${role} application — ${name}`,
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
