import "server-only";
import { getSession } from "@/lib/auth";
import type { Post } from "@/lib/types";

export type PollOption = { id: string; label: string; position: number };
export type PostRow = Post & {
  post_likes: { user_id: string }[];
  comments: { id: string }[];
  poll_options: PollOption[];
  poll_votes: { option_id: string; user_id: string }[];
  attachment_url?: string | null;
};

export const POST_SELECT =
  "*, author:profiles!posts_author_id_fkey(full_name, avatar_url, role), post_likes(user_id), comments(id), poll_options!poll_options_post_id_fkey(id, label, position), poll_votes!poll_votes_post_id_fkey(option_id, user_id)";

/** Agrega links firmados (6 h) a las publicaciones con imagen o video. */
export async function withAttachmentUrls(posts: PostRow[]) {
  const { supabase } = await getSession();
  const paths = posts.map((p) => p.attachment_path).filter(Boolean) as string[];
  if (!paths.length) return posts;
  const { data } = await supabase.storage.from("community").createSignedUrls(paths, 60 * 60 * 6);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return posts.map((p) => ({ ...p, attachment_url: p.attachment_path ? map.get(p.attachment_path) ?? null : null }));
}
