import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Chevron, Logo } from "@/components/ui";
import { SITE_NAME } from "@/lib/utils";

export default async function Home() {
  const { user } = await getSession();
  if (user) redirect("/cursos");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black">
      {/* Fondo estilo Scale Studio */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[20vmax] -top-[25vmax] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.16),transparent_62%)]" />
        <Chevron fill="rgba(212,162,78,.05)" className="absolute right-[6%] top-[14%] w-[min(60vw,680px)] stroke-brand [stroke-width:2]" />
        <span className="absolute -bottom-[30%] -right-[14%] h-[150%] w-[30vw] -skew-x-[32deg] bg-gradient-to-b from-brand-light via-brand to-brand-dark" />
        <span className="absolute -bottom-[30%] -right-[21%] h-[150%] w-[2.2vw] -skew-x-[32deg] bg-[#D8D5CC]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-[clamp(20px,6.95vw,120px)] py-5">
        <Logo />
        <div className="flex items-center gap-5">
          <Link href="/login" className="text-sm font-medium hover:text-brand">Entrar</Link>
          <Link href="/registro" className="btn-outline h-10 px-4">Crear cuenta</Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col justify-end px-[clamp(20px,6.95vw,120px)] pb-20">
        <p className="eyebrow">Plataforma de alumnos · {SITE_NAME}</p>
        <h1 className="display mt-6 text-[clamp(64px,11vw,180px)] leading-[0.86] text-[#ECEAE4]">
          Aprende.<br />Aplica.<br /><span className="text-brand">Escala.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[clamp(18px,1.9vw,24px)] font-light leading-snug">
          Tus clases paso a paso, tu avance guardado y una comunidad para{" "}
          <strong className="font-serif font-normal italic text-brand">crecer en serio</strong>.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/registro" className="btn-primary h-14 px-7 text-[15px]">Crear mi cuenta →</Link>
          <Link href="/login" className="btn-ghost h-14 px-7 text-[15px]">Ya tengo cuenta</Link>
        </div>
      </main>
    </div>
  );
}
