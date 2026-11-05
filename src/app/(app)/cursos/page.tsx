import Link from "next/link";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { getCatalog } from "@/lib/courses";
import { Chevron, EmptyState, PageHeader, ProgressBar } from "@/components/ui";

export const metadata: Metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const { profile } = await requireActive();
  const courses = await getCatalog();
  const mine = courses.filter((c) => c.hasAccess);
  const locked = courses.filter((c) => !c.hasAccess);
  const name = profile.full_name.split(" ")[0];

  return (
    <>
      <PageHeader eyebrow="Tus cursos" title={`Hola${name ? `, ${name}` : ""}`} subtitle="Estos son tus cursos. Sigue donde quedaste." />

      {mine.length === 0 ? (
        <EmptyState
          title="Aún no tienes cursos asignados"
          text="Cuando el equipo te asigne un plan, tus cursos van a aparecer aquí."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <p className="eyebrow mb-5 mt-14">Otros cursos</p>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {locked.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CourseCard({ course: c }: { course: Awaited<ReturnType<typeof getCatalog>>[number] }) {
  const inner = (
    <>
      <div className="relative aspect-video overflow-hidden rounded-t-md bg-black">
        {c.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="relative grid h-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(212,162,78,.22),transparent_60%)] p-6 text-center"><Chevron fill="rgba(212,162,78,.08)" className="absolute -right-6 -bottom-8 w-44" /><span className="display relative text-2xl">{c.title}</span></div>
        )}
        {!c.hasAccess && (
          <div className="absolute inset-0 grid place-items-center bg-black/65 text-ink">
            <span className="chip bg-brand text-on-brand">🔒 No incluido en tu plan</span>
          </div>
        )}
        {!c.published && <span className="chip absolute left-3 top-3 bg-brand text-on-brand">Borrador</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold uppercase leading-tight tracking-tight">{c.title}</h3>
        {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>}
        <div className="mt-auto pt-4">
          {c.hasAccess ? (
            <>
              <ProgressBar value={c.progress} />
              <p className="mt-1.5 text-xs text-muted">{c.lessonCount} lecciones</p>
            </>
          ) : (
            <p className="text-xs text-muted">Pregúntale al equipo cómo sumarlo a tu plan.</p>
          )}
        </div>
      </div>
    </>
  );

  return c.hasAccess ? (
    <Link href={`/cursos/${c.id}`} className="card card-hover flex flex-col">
      {inner}
    </Link>
  ) : (
    <div className="card flex flex-col opacity-90">{inner}</div>
  );
}
