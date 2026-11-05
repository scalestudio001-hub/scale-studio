import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Chevron, Logo } from "@/components/ui";
import { Trailer } from "@/components/trailer";
import { SITE_NAME } from "@/lib/utils";

// Contenido provisional (tomado de la web de Scale Studio)
const TEAM = [
  { name: "Bárbara", role: "Dirección y estrategia", img: "/media/barbara.webp" },
  { name: "Sebastián", role: "Meta Ads y tecnología", img: "/media/sebastian.webp" },
  { name: "Franchesca", role: "Coordinación y clientes", img: "/media/franchesca.webp" },
];

export default async function Home() {
  const { user } = await getSession();
  if (user) redirect("/cursos");

  return (
    <>
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

    {/* Trailer */}
    <section id="trailer" className="bg-[#050505] px-[clamp(20px,6.95vw,120px)] py-[clamp(70px,9vw,120px)]">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">El trailer</p>
        <h2 className="display mb-10 mt-5 text-[clamp(46px,6.4vw,92px)]">
          Un minuto.
          <em className="accent mt-1 block text-[0.82em] leading-[1.1]">Así trabajamos.</em>
        </h2>
        <Trailer src="/media/trailer.mp4" poster="/media/poster.jpg" />
      </div>
    </section>

    {/* Equipo */}
    <section id="equipo" className="bg-bg px-[clamp(20px,6.95vw,120px)] py-[clamp(70px,9vw,120px)]">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">El equipo</p>
        <h2 className="display mt-5 text-[clamp(46px,6.4vw,92px)]">
          Personas reales
          <em className="accent mt-1 block text-[0.82em] leading-[1.1]">detrás de tu aprendizaje.</em>
        </h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m, i) => (
            <article key={m.name} className="group relative aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
              <span className="absolute inset-x-0 top-0 z-10 h-1 origin-left scale-x-0 bg-brand transition-transform duration-700 group-hover:scale-x-100" />
              <span className="absolute right-4 top-4 z-10 bg-brand px-2 py-0.5 font-display text-[13px] tracking-wider text-on-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.img}
                alt={m.name}
                loading="lazy"
                width={540}
                height={720}
                className="h-full w-full scale-[1.04] object-cover grayscale-[0.85] transition duration-1000 group-hover:scale-100 group-hover:grayscale-0"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-55% to-[rgba(14,14,14,.85)]" />
              <div className="absolute inset-x-5 bottom-5 z-10">
                <h3 className="font-display text-3xl font-semibold uppercase leading-none">{m.name}</h3>
                <p className="mt-1.5 font-serif text-[17px] italic text-brand">{m.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    {/* Cierre */}
    <section className="border-t border-line bg-black px-[clamp(20px,6.95vw,120px)] py-20 text-center">
      <h2 className="display text-[clamp(36px,5vw,64px)]">
        ¿Listo para <span className="text-brand">empezar?</span>
      </h2>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/registro" className="btn-primary h-14 px-7 text-[15px]">Crear mi cuenta →</Link>
        <Link href="/login" className="btn-ghost h-14 px-7 text-[15px]">Ya tengo cuenta</Link>
      </div>
      <p className="mt-12 text-xs text-muted">© {new Date().getFullYear()} {SITE_NAME} · Hecho en Chile</p>
    </section>
    </>
  );
}
