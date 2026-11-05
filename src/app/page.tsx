import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { Trailer } from "@/components/trailer";
import { HeroBackground } from "@/components/backgrounds";
import { Marquee, Reveal, RotatingWord } from "@/components/motion";
import { SITE_NAME } from "@/lib/utils";

// Contenido provisional (tomado de la web de Scale Studio)
const TEAM = [
  { name: "Bárbara", role: "Dirección y estrategia", img: "/media/barbara.webp" },
  { name: "Sebastián", role: "Meta Ads y tecnología", img: "/media/sebastian.webp" },
  { name: "Franchesca", role: "Coordinación y clientes", img: "/media/franchesca.webp" },
];

const PAD = "px-[clamp(20px,6.95vw,120px)]";

export default async function Home() {
  const { user } = await getSession();
  if (user) redirect("/cursos");

  return (
    <>
      {/* HERO */}
      <div className="relative flex min-h-svh flex-col overflow-hidden bg-black">
        <HeroBackground />

        <header className={`anim-fade-up relative z-10 flex items-center justify-between py-5 ${PAD}`}>
          <Logo />
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm font-medium transition hover:text-brand">Entrar</Link>
            <Link href="/registro" className="btn-outline h-10 px-4">Crear cuenta</Link>
          </div>
        </header>

        <main className={`relative z-10 flex flex-1 flex-col justify-end pb-20 ${PAD}`}>
          <p className="eyebrow anim-fade-up [animation-delay:.2s]">Plataforma de alumnos · {SITE_NAME}</p>
          <h1 className="display mt-6 text-[clamp(64px,11vw,180px)] leading-[0.86] text-[#ECEAE4]">
            <span className="anim-line"><span className="[animation-delay:.35s]">Aprende.</span></span>
            <span className="anim-line"><span className="[animation-delay:.5s]">Aplica.</span></span>
            <span className="anim-line"><span className="[animation-delay:.65s]"><RotatingWord words={["Escala.", "Vende.", "Crece."]} /></span></span>
          </h1>
          <p className="anim-fade-up mt-6 max-w-xl text-[clamp(18px,1.9vw,24px)] font-light leading-snug [animation-delay:1s]">
            Tus clases paso a paso, tu avance guardado y una comunidad para{" "}
            <strong className="font-serif font-normal italic text-brand">crecer en serio</strong>.
          </p>
          <div className="anim-fade-up mt-8 flex flex-wrap gap-3 [animation-delay:1.2s]">
            <Link href="/registro" className="btn-primary btn-shine h-14 px-7 text-[15px]">Crear mi cuenta →</Link>
            <a href="#trailer" className="btn-ghost h-14 px-7 text-[15px]">Ver trailer ▶</a>
          </div>
        </main>

        {/* indicador de scroll */}
        <a href="#trailer" aria-label="Bajar" className="anim-fade-up absolute bottom-8 left-1/2 z-10 hidden h-9 w-[22px] -translate-x-1/2 rounded-xl border-[1.5px] border-ink/60 [animation-delay:1.6s] sm:block">
          <span className="absolute left-1/2 top-[7px] h-[7px] w-[3px] -translate-x-1/2 animate-bounce rounded-sm bg-brand" />
        </a>
      </div>

      <Marquee items={["Clases paso a paso", "Comunidad", "Tu avance guardado", "Acompañamiento"]} />

      {/* TRAILER */}
      <section id="trailer" className={`bg-[#050505] py-[clamp(70px,9vw,120px)] ${PAD}`}>
        <div className="mx-auto max-w-6xl">
          <Reveal><p className="eyebrow">El trailer</p></Reveal>
          <Reveal delay={100}>
            <h2 className="display mb-10 mt-5 text-[clamp(46px,6.4vw,92px)]">
              Un minuto.
              <em className="accent mt-1 block text-[0.82em] leading-[1.1]">Así trabajamos.</em>
            </h2>
          </Reveal>
          <Reveal delay={200}><Trailer src="/media/trailer.mp4" poster="/media/poster.jpg" /></Reveal>
        </div>
      </section>

      {/* EQUIPO */}
      <section id="equipo" className={`bg-bg py-[clamp(70px,9vw,120px)] ${PAD}`}>
        <div className="mx-auto max-w-6xl">
          <Reveal><p className="eyebrow">El equipo</p></Reveal>
          <Reveal delay={100}>
            <h2 className="display mt-5 text-[clamp(46px,6.4vw,92px)]">
              Personas reales
              <em className="accent mt-1 block text-[0.82em] leading-[1.1]">detrás de tu aprendizaje.</em>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={150 * i}>
                <article className="group relative aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
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
                    className="h-full w-full scale-[1.06] object-cover grayscale-[0.85] transition duration-1000 group-hover:scale-100 group-hover:grayscale-0"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent from-55% to-[rgba(14,14,14,.85)]" />
                  <div className="absolute inset-x-5 bottom-5 z-10 transition-transform duration-500 group-hover:-translate-y-1">
                    <h3 className="font-display text-3xl font-semibold uppercase leading-none">{m.name}</h3>
                    <p className="mt-1.5 font-serif text-[17px] italic text-brand">{m.role}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Marquee items={["Aprende", "Aplica", "Escala"]} gold={false} reverse />

      {/* CIERRE */}
      <section className={`relative overflow-hidden bg-black py-24 text-center ${PAD}`}>
        <div aria-hidden className="anim-glow-a pointer-events-none absolute left-1/2 top-1/2 h-[40vmax] w-[40vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.14),transparent_62%)]" />
        <Reveal>
          <h2 className="display relative text-[clamp(36px,5vw,64px)]">
            ¿Listo para <span className="text-brand">empezar?</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/registro" className="btn-primary btn-shine h-14 px-7 text-[15px]">Crear mi cuenta →</Link>
            <Link href="/login" className="btn-ghost h-14 px-7 text-[15px]">Ya tengo cuenta</Link>
          </div>
        </Reveal>
        <p className="relative mt-14 text-xs text-muted">© {new Date().getFullYear()} {SITE_NAME} · Hecho en Chile</p>
      </section>
    </>
  );
}
