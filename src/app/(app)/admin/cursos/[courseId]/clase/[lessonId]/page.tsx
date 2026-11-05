import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { LessonEditor } from "@/components/lesson-editor";
import type { LessonFile } from "@/lib/types";

export const metadata: Metadata = { title: "Editar clase" };

export default async function EditLessonPage({ params }: PageProps<"/admin/cursos/[courseId]/clase/[lessonId]">) {
  const { supabase } = await requireAdmin();
  const { courseId, lessonId } = await params;
  const { data: l } = await supabase.from("lessons").select("*, modules!inner(course_id, title)").eq("id", lessonId).maybeSingle();
  if (!l || (l.modules as { course_id: string }).course_id !== courseId) notFound();

  let videoSigned: string | null = null;
  if (l.video_path) {
    const { data } = await supabase.storage.from("lessons").createSignedUrl(l.video_path, 60 * 60 * 3);
    videoSigned = data?.signedUrl ?? null;
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/cursos/${courseId}`} className="text-sm font-medium text-muted hover:text-brand">
          ← {(l.modules as { title: string }).title}
        </Link>
        <Link href={`/cursos/${courseId}/${lessonId}`} className="btn-ghost h-9 text-xs">Ver como alumno ↗</Link>
      </div>
      <LessonEditor
        courseId={courseId}
        lesson={{
          id: l.id,
          title: l.title,
          duration_min: l.duration_min,
          published: l.published,
          video_url: l.video_url,
          video_path: l.video_path,
          content_html: l.content_html,
          description: l.description,
          files: (l.files ?? []) as LessonFile[],
        }}
        videoSigned={videoSigned}
      />
    </>
  );
}
