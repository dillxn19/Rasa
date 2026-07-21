import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  user_id: string;
  review_id: string;
  content: string;
  like_count: number;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export async function getComments(reviewId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, user_id, review_id, content, like_count, created_at,
      user:users!user_id ( id, username, display_name, avatar_url )
    `)
    .eq('review_id', reviewId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(userId: string, reviewId: string, content: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: userId, review_id: reviewId, content: content.trim() })
    .select(`
      id, user_id, review_id, content, like_count, created_at,
      user:users!user_id ( id, username, display_name, avatar_url )
    `)
    .single();

  if (error) throw error;
  return data as unknown as Comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
  if (error) throw error;
}
