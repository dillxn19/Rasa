/* ── Rasa waitlist — form handling ──────────────────────────────
 *
 * HOW TO COLLECT SIGNUPS
 * ----------------------
 * Set WAITLIST_ENDPOINT below to any HTTP endpoint that accepts a POST.
 * Easiest options (pick one, paste the URL):
 *
 *   • Formspree   → https://formspree.io  (free, gives you an endpoint like
 *                    https://formspree.io/f/xxxxxxx — emails you every signup)
 *   • Google Form → deploy a Google Apps Script web app, or use a Sheet webhook
 *   • Supabase    → POST to https://<ref>.supabase.co/rest/v1/waitlist with your
 *                    anon key (create a `waitlist` table + insert RLS policy)
 *
 * Until an endpoint is set, the form still "works": it validates, de-dupes, and
 * saves entries to the browser's localStorage so you can demo it and export
 * later (see exportWaitlist() in the console).
 * ------------------------------------------------------------- */

// Waitlist signups + job applications POST to Supabase Edge Functions, which
// email you via Resend. (Public anon key — safe to expose; same one shipped in the app.)
const WAITLIST_ENDPOINT = 'https://mskdjbbwgsjkcsxgcxvt.supabase.co/functions/v1/waitlist-signup';
const JOBS_ENDPOINT = 'https://mskdjbbwgsjkcsxgcxvt.supabase.co/functions/v1/job-application';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RqYmJ3Z3Nqa2NzeGdjeHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjI3NDUsImV4cCI6MjA5ODAzODc0NX0.z3DGPKeGgRN0me15IuFquoIi87dZ6GV4qnh5IUBdMRY';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Supabase Edge Functions require the anon key on the request.
function postHeaders(endpoint) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (endpoint.includes('supabase.co') && SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

function setNote(el, msg, kind) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('success', 'error');
  if (kind) el.classList.add(kind);
}

function saveLocally(entry) {
  const key = 'rasa_waitlist';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  if (list.some((e) => e.email.toLowerCase() === entry.email.toLowerCase())) {
    return { duplicate: true };
  }
  list.push({ ...entry, ts: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(list));
  return { duplicate: false };
}

// Handy: run exportWaitlist() in the browser console to get a CSV of local signups.
window.exportWaitlist = function () {
  const list = JSON.parse(localStorage.getItem('rasa_waitlist') || '[]');
  if (!list.length) return console.log('No local signups yet.');
  const header = 'name,email,phone,referral,ts';
  const rows = list.map((e) =>
    [e.name, e.email, e.phone || '', e.referral || '', e.ts].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  console.log(csv);
  return csv;
};

async function handleSubmit(form, note) {
  const data = Object.fromEntries(new FormData(form).entries());
  const name = (data.name || '').trim();
  const email = (data.email || '').trim();

  if (!name) return setNote(note, 'Please enter your name.', 'error');
  if (!EMAIL_RE.test(email)) return setNote(note, 'Please enter a valid email.', 'error');

  const entry = {
    name,
    email,
    phone: (data.phone || '').trim(),
    referral: (data.referral || '').trim().toUpperCase(),
  };

  const btn = form.querySelector('button[type="submit"]');
  const originalLabel = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Joining…'; }

  try {
    if (WAITLIST_ENDPOINT) {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: postHeaders(WAITLIST_ENDPOINT),
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error('Request failed');
      saveLocally(entry); // keep a local backup copy too
    } else {
      const { duplicate } = saveLocally(entry);
      if (duplicate) {
        setNote(note, "You're already on the list 🎉 See you soon!", 'success');
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        return;
      }
    }

    form.reset();
    setNote(note, "You're on the list! 🎉 We'll be in touch with your invite.", 'success');
    // Fire a lightweight analytics hook if one is present.
    if (window.posthog) window.posthog.capture('waitlist_signup', { has_referral: !!entry.referral });
  } catch (err) {
    setNote(note, 'Something went wrong — please try again, or email hello@rasamalaysia.org.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}

/* ── Job applications ─────────────────────────────────────────
 * Saved to JOBS_ENDPOINT if set, else to localStorage ('rasa_applications').
 * Run exportApplications() in the console to dump them as CSV.            */
function saveApplicationLocally(entry) {
  const key = 'rasa_applications';
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.push({ ...entry, ts: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(list));
}

window.exportApplications = function () {
  const list = JSON.parse(localStorage.getItem('rasa_applications') || '[]');
  if (!list.length) return console.log('No applications yet.');
  const header = 'role,name,email,instagram,tiktok,university,portfolio,message,ts';
  const rows = list.map((e) =>
    [e.role, e.name, e.email, e.instagram, e.tiktok || '', e.university || '', e.portfolio || '', e.message || '', e.ts]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  const csv = [header, ...rows].join('\n');
  console.log(csv);
  return csv;
};

function initApplyModal() {
  const modal = document.getElementById('apply-modal');
  const form = document.getElementById('apply-form');
  const note = document.getElementById('apply-note');
  const title = document.getElementById('apply-title');
  const sub = document.getElementById('apply-sub');
  const roleInput = document.getElementById('apply-role');
  const uni = document.getElementById('apply-university');
  const portfolio = document.getElementById('apply-portfolio');
  if (!modal || !form) return;

  const open = (role, fields) => {
    setNote(note, '', '');
    form.reset();
    roleInput.value = role;
    title.textContent = `Apply — ${role}`;
    sub.textContent = 'Tell us about you — we read every application.';
    // Campus Ambassadors give their university; Content applicants give a portfolio link.
    const isCampus = fields === 'campus';
    uni.classList.toggle('hidden-field', !isCampus);
    uni.required = isCampus;
    portfolio.classList.toggle('hidden-field', isCampus);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const close = () => { modal.hidden = true; document.body.style.overflow = ''; };

  document.querySelectorAll('.apply-btn').forEach((btn) =>
    btn.addEventListener('click', () => open(btn.dataset.role, btn.dataset.fields))
  );
  document.getElementById('apply-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.name.trim()) return setNote(note, 'Please enter your name.', 'error');
    if (!EMAIL_RE.test(data.email || '')) return setNote(note, 'Please enter a valid email.', 'error');
    if (!data.instagram || !data.instagram.trim()) return setNote(note, 'Please add your Instagram handle.', 'error');
    if (uni.required && !data.university.trim()) return setNote(note, 'Please tell us your university.', 'error');

    const entry = {
      role: data.role,
      name: data.name.trim(),
      email: data.email.trim(),
      instagram: data.instagram.trim(),
      tiktok: (data.tiktok || '').trim(),
      university: (data.university || '').trim(),
      portfolio: (data.portfolio || '').trim(),
      message: (data.message || '').trim(),
    };

    const btn = form.querySelector('button[type="submit"]');
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      if (JOBS_ENDPOINT) {
        const res = await fetch(JOBS_ENDPOINT, { method: 'POST', headers: postHeaders(JOBS_ENDPOINT), body: JSON.stringify(entry) });
        if (!res.ok) throw new Error('failed');
        saveApplicationLocally(entry); // keep a local backup copy too
      } else {
        saveApplicationLocally(entry);
      }
      setNote(note, "Application received! 🎉 We'll be in touch.", 'success');
      if (window.posthog) window.posthog.capture('job_application', { role: entry.role });
      setTimeout(close, 1400);
    } catch (err) {
      setNote(note, 'Something went wrong — email jobs@rasamalaysia.org instead.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const pairs = [
    ['waitlist-form', 'form-note'],
  ];
  pairs.forEach(([formId, noteId]) => {
    const form = document.getElementById(formId);
    const note = document.getElementById(noteId);
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); handleSubmit(form, note); });
  });

  initApplyModal();
});
