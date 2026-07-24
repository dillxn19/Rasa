// Image moderation via Google Cloud Vision SafeSearch. Given a public image URL
// (a just-uploaded review photo), returns whether it's safe to show. Fails OPEN
// (safe:true) if the Vision API isn't configured, so uploads never hard-break —
// flip GOOGLE_VISION_KEY on to enforce.
//
// Setup: enable "Cloud Vision API" on the GCP project and set the secret
//   supabase secrets set GOOGLE_VISION_KEY=<key with Vision API access>
// (can be the same Google key as Places if you widen its API restrictions).
import { corsHeaders, json } from '../_shared/cors.ts';

const VISION_KEY = Deno.env.get('GOOGLE_VISION_KEY') || Deno.env.get('GOOGLE_PLACES_KEY');
const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Likelihoods that count as "not allowed".
const BLOCK = new Set(['LIKELY', 'VERY_LIKELY']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) return json({ safe: true }); // nothing to check

    // No key configured → fail open (allow), but say it wasn't enforced.
    if (!VISION_KEY) return json({ safe: true, enforced: false });

    const res = await fetch(`${VISION_URL}?key=${VISION_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }],
        }],
      }),
    });

    if (!res.ok) {
      console.error('[moderate-image] vision failed', res.status, await res.text());
      return json({ safe: true, enforced: false }); // fail open
    }

    const data = await res.json();
    const s = data?.responses?.[0]?.safeSearchAnnotation;
    if (!s) return json({ safe: true, enforced: false });

    const flagged = BLOCK.has(s.adult) || BLOCK.has(s.violence) || BLOCK.has(s.racy);
    return json({
      safe: !flagged,
      enforced: true,
      categories: { adult: s.adult, violence: s.violence, racy: s.racy },
    });
  } catch (e) {
    console.error('[moderate-image]', e);
    return json({ safe: true, enforced: false }); // fail open
  }
});
