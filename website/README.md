# Rasa — Waitlist Website

A simple, on-brand, static landing page + waitlist for Rasa. Pure HTML/CSS/JS — no build step, no framework. Deploy anywhere.

## Files
- `index.html` — the page (hero + waitlist, features, how-it-works, **Jobs**, CTA, footer)
- `styles.css` — brand styling (Chili Red / Coconut Cream / Turmeric Gold / Pandan Green), fully responsive
- `script.js` — form validation + submission

## Run locally
Just open `index.html` in a browser, or serve the folder:
```bash
cd website
python3 -m http.server 8080   # then visit http://localhost:8080
```

## Collect signups (1 step)
Open `script.js` and set `WAITLIST_ENDPOINT` to a POST URL. Easiest options:

- **Formspree** (recommended, free): create a form at https://formspree.io → paste the endpoint (e.g. `https://formspree.io/f/xxxxxxx`). You'll get an email per signup.
- **Google Sheets**: deploy a Google Apps Script web app that appends rows, paste its `/exec` URL.
- **Supabase** (you already use it): create a `waitlist` table with an insert RLS policy, then POST to `https://<ref>.supabase.co/rest/v1/waitlist` with the anon key in the headers.

Until an endpoint is set, the form still validates and saves signups to the browser's `localStorage`. Run `exportWaitlist()` in the browser console to dump them as CSV.

The form posts JSON: `{ name, email, phone, referral }` — matching the fields the marketing plan wants (incl. the optional **referral code**).

## Deploy (pick one)
- **Vercel**: `vercel` in this folder (or drag-drop the folder at vercel.com).
- **Netlify**: drag-drop the `website/` folder at app.netlify.com/drop.
- **GitHub Pages**: push and enable Pages on the folder.
- **Cloudflare Pages**: connect the repo, set the output dir to `website`.

## Job applications
Each job's **Apply** button opens a modal form that gets **saved** (same pattern as the waitlist):
- Set `JOBS_ENDPOINT` in `script.js` to collect them (Formspree/webhook/Supabase). If unset, they save to `localStorage` — run `exportApplications()` in the browser console for a CSV.
- Both roles collect **Instagram + TikTok handles**. **Campus Ambassador** also requires **University**; **Content Creator Intern** asks for a **portfolio/content link**.
- Application JSON: `{ role, name, email, instagram, tiktok, university, portfolio, message }`.

Pay wording (per your call): **Content Creator Intern** = unpaid to start, **paid once content hits impression milestones**. **Campus Ambassador** = **paid per activation**. No amounts disclosed.

## Before launch
- Point `rasamalaysia.org` at the deploy and update the `og:image` (`og-image.png`) + favicon.
- Update the Instagram / TikTok / email links in the footer and the `jobs@rasamalaysia.org` / `hello@rasamalaysia.org` addresses.
