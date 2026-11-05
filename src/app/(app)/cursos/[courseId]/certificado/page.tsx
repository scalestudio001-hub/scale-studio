import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { getCourseTree } from "@/lib/courses";
import { Chevron } from "@/components/ui";
import { SITE_NAME } from "@/lib/utils";
import { isoFromNow } from "@/lib/time";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Certificado" };

export default async function CertificatePage({ params }: PageProps<"/cursos/[courseId]/certificado">) {
  const { supabase, user, profile } = await requireActive();
  const { courseId } = await params;
  const data = await getCourseTree(courseId);
  if (!data || !data.hasAccess) redirect("/cursos");

  const { data: code, error } = await supabase.rpc("issue_certificate", { cid: courseId });
  if (error)
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="display text-3xl">Casi 🏁</p>
        <p className="mt-2 text-muted">{error.message}. Completa todas las clases para obtener tu certificado.</p>
        <Link href={`/cursos/${courseId}`} className="btn-primary mt-6">Volver al curso</Link>
      </div>
    );

  const { data: cert } = await supabase.from("certificates").select("issued_at").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  const date = new Date(cert?.issued_at ?? isoFromNow()).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const [first, ...rest] = SITE_NAME.split(" ");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/cursos/${courseId}`} className="text-sm font-medium text-muted hover:text-brand">← {data.course.title}</Link>
        <PrintButton />
      </div>

      <div id="certificado" className="relative mx-auto aspect-[1.414/1] w-full max-w-5xl overflow-hidden border border-brand/40 bg-[#0b0b0b] text-[#F3F2EE] shadow-2xl print:max-w-none print:border-0 print:shadow-none">
        <div className="absolute -left-[15%] -top-[30%] h-[80%] w-[60%] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.22),transparent_62%)]" />
        <span className="absolute -bottom-[20%] right-[6%] h-[160%] w-[16%] -skew-x-[32deg] bg-gradient-to-b from-[#E8C27A] via-[#D4A24E] to-[#8A6420]" />
        <span className="absolute -bottom-[20%] right-[1%] h-[160%] w-[1.6%] -skew-x-[32deg] bg-[#D8D5CC]" />
        <div className="absolute inset-[3%] border border-[#D4A24E]/50" />
        <div className="relative flex h-full flex-col justify-between p-[7%]">
          <div className="flex items-baseline gap-2">
            <span className="flex items-end text-[clamp(16px,2.4vw,30px)] font-extrabold leading-none">
              {first.toUpperCase().includes("A") ? (
                <>
                  {first.toUpperCase().split("A")[0]}
                  <Chevron fill="#D4A24E" className="mx-[0.04em] h-[0.8em] w-[0.98em]" />
                  {first.toUpperCase().split("A").slice(1).join("A")}
                </>
              ) : first.toUpperCase()}
            </span>
            <span className="font-serif text-[clamp(13px,1.8vw,22px)] italic">{rest.join(" ")}</span>
          </div>
          <div>
            <p className="flex items-center gap-3 text-[clamp(8px,1vw,12px)] font-semibold uppercase tracking-[0.35em] text-[#D4A24E]">
              <span className="h-[2px] w-8 bg-[#D4A24E]" /> Certificado de finalización
            </p>
            <p className="mt-[2%] font-serif text-[clamp(13px,1.8vw,22px)] italic text-[#a9a69f]">Se otorga a</p>
            <h1 className="mt-[1%] font-display text-[clamp(30px,6vw,78px)] font-bold uppercase leading-[0.9]">{profile.full_name}</h1>
            <p className="mt-[3%] max-w-[62%] text-[clamp(11px,1.5vw,18px)] font-light leading-snug">
              por completar con éxito el curso{" "}
              <strong className="font-serif font-normal italic text-[#D4A24E]">{data.course.title}</strong>, con sus {data.lessons.length} clases.
            </p>
          </div>
          <div className="flex items-end gap-[6%] text-[clamp(8px,1vw,12px)] uppercase tracking-[0.2em] text-[#a9a69f]">
            <div>
              <p className="text-[#F3F2EE]">{date}</p>
              <p>Fecha</p>
            </div>
            <div>
              <p className="font-mono text-[#F3F2EE]">{code as string}</p>
              <p>Código de verificación</p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } body * { visibility: hidden } #certificado, #certificado * { visibility: visible } #certificado { position: fixed; inset: 0; width: 100vw; height: 100vh; aspect-ratio: auto } }`}</style>
    </>
  );
}
