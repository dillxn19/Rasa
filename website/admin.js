/* ── Rasa web admin ──────────────────────────────────────────
 * Standalone founder dashboard. NOT linked from the public site.
 * Logs in with a Rasa admin account and calls the is_admin()-gated RPCs
 * (admin_app_stats / admin_ambassador_leaderboard from migration 020).
 *
 * The keys below are the PUBLIC url + anon key (same ones shipped in the
 * mobile app). They're safe to expose — all data access is protected by RLS
 * and the admin-gated RPCs. Only an account with users.is_admin = true can
 * read anything here.
 * ------------------------------------------------------------- */
const SUPABASE_URL = 'https://mskdjbbwgsjkcsxgcxvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1za2RqYmJ3Z3Nqa2NzeGdjeHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NjI3NDUsImV4cCI6MjA5ODAzODc0NX0.z3DGPKeGgRN0me15IuFquoIi87dZ6GV4qnh5IUBdMRY';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const loginView = $('login');
const dashView = $('dash');

const STAT_DEFS = [
  { key: 'total_users', label: 'Total users', sub: (s) => `+${s.new_users_7d} in 7d` },
  { key: 'total_reviews', label: 'Reviews', sub: (s) => `+${s.reviews_7d} in 7d` },
  { key: 'total_restaurants', label: 'Restaurants' },
  { key: 'activation_rate', label: 'Activation rate', fmt: (v) => `${v}%` },
  { key: 'total_referrals', label: 'Referrals' },
  { key: 'activated_referrals', label: 'Activated' },
];

async function loadDashboard() {
  // App stats — this RPC throws for non-admins, which is how we gate the UI.
  const { data: stats, error: statsErr } = await sb.rpc('admin_app_stats');
  if (statsErr) {
    if (String(statsErr.message).includes('not_admin')) {
      showLogin("That account isn't an admin. Ask an admin to flag you (users.is_admin = true).");
    } else {
      showLogin('Could not load dashboard: ' + statsErr.message);
    }
    await sb.auth.signOut();
    return;
  }

  const s = Array.isArray(stats) ? stats[0] : stats;
  $('stats').innerHTML = STAT_DEFS.map((d) => {
    const raw = s[d.key] ?? 0;
    const val = d.fmt ? d.fmt(raw) : Number(raw).toLocaleString();
    const sub = d.sub ? `<div class="s">${d.sub(s)}</div>` : '';
    return `<div class="stat"><div class="n">${val}</div><div class="l">${d.label}</div>${sub}</div>`;
  }).join('');

  // Ambassador leaderboard
  const { data: amb } = await sb.rpc('admin_ambassador_leaderboard');
  const body = $('amb-body');
  const empty = $('amb-empty');
  if (!amb || amb.length === 0) {
    body.innerHTML = '';
    empty.textContent = 'No referrals yet — performance shows up here once people start inviting.';
  } else {
    empty.textContent = '';
    body.innerHTML = amb.map((a, i) => {
      const rate = a.invited > 0 ? Math.round((a.activated / a.invited) * 100) : 0;
      const medal = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
      const tag = a.is_ambassador ? '<span class="amb-tag">AMB</span>' : '';
      const handle = a.username ? `@${a.username}` : '';
      return `<tr>
        <td>${medal}</td>
        <td><strong>${escapeHtml(a.display_name || 'New foodie')}</strong>${tag}<br><span class="muted">${escapeHtml(handle)}</span></td>
        <td class="num">${a.invited}</td>
        <td class="num">${a.activated}</td>
        <td class="num">${rate}%</td>
      </tr>`;
    }).join('');
  }

  // Waitlist + job applications are read directly (RLS restricts SELECT to admins).
  await loadWaitlist();
  await loadApplications();
  await loadReports();

  dashView.classList.remove('hidden');
  loginView.classList.add('hidden');
}

async function loadReports() {
  const { data, error } = await sb.rpc('admin_reports');
  const body = $('rp-body'), empty = $('rp-empty'), count = $('rp-count');
  if (error) { empty.textContent = 'Could not load reports: ' + error.message; return; }
  const pending = (data || []).filter((r) => r.status === 'pending');
  count.textContent = String(pending.length);
  if (!data || data.length === 0) { body.innerHTML = ''; empty.textContent = 'No reports — clean queue.'; return; }
  empty.textContent = '';
  body.innerHTML = data.map((r) => {
    const target = r.review_id ? 'Review' : r.comment_id ? 'Comment' : r.reported_username ? 'User' : 'Restaurant';
    const resolved = r.status !== 'pending';
    const action = resolved
      ? `<span class="muted">${escapeHtml(r.status)}</span>`
      : `<button class="btn btn-sm" data-resolve="${r.id}">Resolve</button>`;
    return `<tr>
      <td>${fmtDate(r.created_at)}</td>
      <td><strong>${escapeHtml(r.reason)}</strong>${r.description ? `<br><small>${escapeHtml(r.description)}</small>` : ''}</td>
      <td>${escapeHtml(r.reporter_username ? '@' + r.reporter_username : r.reporter_name || '—')}</td>
      <td>${escapeHtml(r.reported_username ? '@' + r.reported_username : r.reported_name || '—')}</td>
      <td>${target}</td>
      <td>${escapeHtml(r.status)}</td>
      <td>${action}</td>
    </tr>`;
  }).join('');

  body.querySelectorAll('button[data-resolve]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '…';
      const { error: e } = await sb.rpc('admin_resolve_report', { p_id: btn.dataset.resolve, p_status: 'resolved' });
      if (e) { btn.disabled = false; btn.textContent = 'Resolve'; alert(e.message); return; }
      loadReports();
    })
  );
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadWaitlist() {
  const { data, error } = await sb.from('waitlist').select('*').order('created_at', { ascending: false }).limit(1000);
  const body = $('wl-body'), empty = $('wl-empty'), count = $('wl-count');
  if (error) { empty.textContent = 'Could not load waitlist: ' + error.message; return; }
  count.textContent = String(data.length);
  if (!data.length) { body.innerHTML = ''; empty.textContent = 'No signups yet.'; return; }
  empty.textContent = '';
  body.innerHTML = data.map((w) => `<tr>
    <td>${fmtDate(w.created_at)}</td>
    <td><strong>${escapeHtml(w.name)}</strong></td>
    <td>${escapeHtml(w.email)}</td>
    <td>${escapeHtml(w.phone || '—')}</td>
    <td>${escapeHtml(w.referral || '—')}</td>
  </tr>`).join('');
}

async function loadApplications() {
  const { data, error } = await sb.from('job_applications').select('*').order('created_at', { ascending: false }).limit(1000);
  const body = $('ja-body'), empty = $('ja-empty'), count = $('ja-count');
  if (error) { empty.textContent = 'Could not load applications: ' + error.message; return; }
  count.textContent = String(data.length);
  if (!data.length) { body.innerHTML = ''; empty.textContent = 'No applications yet.'; return; }
  empty.textContent = '';
  body.innerHTML = data.map((j) => {
    const socials = [j.instagram && `IG ${escapeHtml(j.instagram)}`, j.tiktok && `TT ${escapeHtml(j.tiktok)}`].filter(Boolean).join('<br>') || '—';
    const extra = [j.university && `🎓 ${escapeHtml(j.university)}`, j.portfolio && `<a href="${escapeHtml(j.portfolio)}" target="_blank" rel="noopener">portfolio</a>`, j.message && `<small>${escapeHtml(j.message)}</small>`].filter(Boolean).join('<br>') || '—';
    return `<tr>
      <td>${fmtDate(j.created_at)}</td>
      <td><strong>${escapeHtml(j.role)}</strong></td>
      <td>${escapeHtml(j.name)}</td>
      <td>${escapeHtml(j.email)}</td>
      <td>${socials}</td>
      <td>${extra}</td>
    </tr>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showLogin(msg) {
  dashView.classList.add('hidden');
  loginView.classList.remove('hidden');
  const el = $('login-msg');
  el.textContent = msg || '';
  el.className = 'msg' + (msg ? ' error' : '');
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  btn.disabled = false; btn.textContent = 'Sign in';
  if (error) return showLogin(error.message);
  loadDashboard();
});

$('logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin('');
  $('email').value = ''; $('password').value = '';
});

// Resume an existing session on load.
sb.auth.getSession().then(({ data }) => {
  if (data.session) loadDashboard();
});
