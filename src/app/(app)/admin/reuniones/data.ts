import "server-only";
import { requireAdmin } from "@/lib/auth";
import { chileToUtc } from "@/lib/time";

export type RegMeeting = {
  id: string; starts_at: string; ends_at: string; topic: string; status: string; meeting_url: string | null; coach_notes: string | null; created_at: string;
  coach_id: string; student_id: string;
  coach: { full_name: string } | null;
  student: { full_name: string; avatar_url: string | null } | null;
};

export async function loadMeetings(sp: Record<string, string | string[] | undefined>) {
  const { supabase } = await requireAdmin();
  const coach = typeof sp.coach === "string" ? sp.coach : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const month = typeof sp.mes === "string" && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : "";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  let query = supabase
    .from("meetings")
    .select("id, starts_at, ends_at, topic, status, meeting_url, coach_notes, created_at, coach_id, student_id, coach:profiles!meetings_coach_id_fkey(full_name), student:profiles!meetings_student_id_fkey(full_name, avatar_url)")
    .order("starts_at", { ascending: false })
    .limit(1000);
  if (coach) query = query.eq("coach_id", coach);
  if (status) query = query.eq("status", status);
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    query = query.gte("starts_at", chileToUtc(`${month}-01`, "00:00").toISOString()).lt("starts_at", chileToUtc(`${next}-01`, "00:00").toISOString());
  }
  const { data } = await query;
  let rows = (data ?? []) as unknown as RegMeeting[];
  if (q) rows = rows.filter((r) => (r.student?.full_name ?? "").toLowerCase().includes(q) || r.topic.toLowerCase().includes(q));
  return { rows, filters: { coach, status, month, q } };
}
