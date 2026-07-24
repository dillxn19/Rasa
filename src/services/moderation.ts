import { supabase } from '@/lib/supabase';

// ── Reporting ──────────────────────────────────────────────
// Targets the existing `reports` table (migration 001 + 013 comment_id).

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate'
  | 'false_info'
  | 'impersonation'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'inappropriate', label: 'Inappropriate or offensive' },
  { value: 'false_info', label: 'False information' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Something else' },
];

export interface ReportInput {
  reporterId: string;
  reason: ReportReason;
  description?: string;
  reviewId?: string;
  userId?: string;
  commentId?: string;
  restaurantId?: string;
}

/** File a moderation report. RLS only lets a user insert rows as themselves. */
export async function reportContent(input: ReportInput): Promise<void> {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    reason: input.reason,
    description: input.description?.trim() || null,
    review_id: input.reviewId ?? null,
    user_id: input.userId ?? null,
    comment_id: input.commentId ?? null,
    restaurant_id: input.restaurantId ?? null,
  });
  if (error) throw error;
}

// ── Image moderation ───────────────────────────────────────

/**
 * Checks a just-uploaded photo URL against Google Vision SafeSearch via the
 * `moderate-image` Edge Function. Returns true when the image is safe to show.
 * Fails OPEN (returns true) if moderation is unavailable, so a scanning outage
 * never blocks a genuine user — enforcement is on once GOOGLE_VISION_KEY is set.
 */
export async function moderateImage(imageUrl: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('moderate-image', {
      body: { imageUrl },
    });
    if (error) return true;
    return data?.safe !== false;
  } catch {
    return true;
  }
}

// ── Blocking ───────────────────────────────────────────────

/** Block a user. The DB trigger also severs any follow in both directions. */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  // Ignore duplicate-block races (unique constraint).
  if (error && error.code !== '23505') throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);
  if (error) throw error;
}

/** IDs the current user has blocked — used to filter feeds, search, comments. */
export async function getBlockedUserIds(blockerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', blockerId);
  if (error) return []; // fail-safe: before migration 013 runs, block nothing
  return (data ?? []).map((r: { blocked_id: string }) => r.blocked_id);
}

/** Is a specific user currently blocked by me? */
export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();
  return !!data;
}
