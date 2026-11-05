import { Chevron } from "@/components/ui";
import { Parallax } from "@/components/motion";

/** Fondo animado del inicio: brillos, chevrón que se dibuja y flota, franjas doradas y grano. */
export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="anim-glow-a absolute -left-[20vmax] -top-[25vmax] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.18),transparent_62%)]" />
      <div className="anim-glow-b absolute -bottom-[30vmax] left-[30%] h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.08),transparent_60%)]" />
      <Parallax strength={26} className="absolute right-[6%] top-[12%] w-[min(60vw,680px)]">
        <div className="anim-float">
          <svg viewBox="-4 -4 288 260" className="anim-draw w-full">
            <path d="M140 0 L280 252 H199 L140 140 L80 252 H0 Z" fill="transparent" stroke="var(--brand)" strokeWidth={2} />
          </svg>
        </div>
      </Parallax>
      <span className="anim-slash absolute -bottom-[30%] -right-[14%] h-[150%] w-[30vw] bg-gradient-to-b from-brand-light via-brand to-brand-dark [animation-delay:.25s]" />
      <span className="anim-slash absolute -bottom-[30%] -right-[21%] h-[150%] w-[2.2vw] bg-[#D8D5CC] [animation-delay:.4s]" />
      <span className="anim-slash anim-pulse-line absolute -bottom-[30%] right-[22%] h-[150%] w-px bg-brand/40 [animation-delay:.55s]" />
      <div className="grain" />
    </div>
  );
}

/** Fondo animado del login y registro. */
export function AuthBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="anim-glow-a absolute -left-[20vmax] -top-[25vmax] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.16),transparent_62%)]" />
      <div className="anim-glow-b absolute -bottom-[25vmax] -right-[15vmax] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.10),transparent_60%)]" />
      <Parallax strength={20} className="absolute -bottom-[12%] -right-[8%] w-[min(72vw,780px)]">
        <div className="anim-float">
          <svg viewBox="-4 -4 288 260" className="anim-draw w-full opacity-60">
            <path d="M140 0 L280 252 H199 L140 140 L80 252 H0 Z" fill="transparent" stroke="var(--brand)" strokeWidth={1.5} />
          </svg>
        </div>
      </Parallax>
      <Parallax strength={-14} className="absolute -left-[6%] top-[8%] w-[min(30vw,300px)]">
        <div className="anim-float [animation-delay:-4s]">
          <Chevron fill="rgba(212,162,78,.06)" className="w-full" />
        </div>
      </Parallax>
      <span className="anim-slash anim-pulse-line absolute -bottom-[30%] left-[18%] h-[150%] w-px bg-brand/30 [animation-delay:.4s]" />
      <div className="grain" />
    </div>
  );
}

/** Fondo vivo y sutil para dentro de la plataforma (no distrae al estudiar). */
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="anim-glow-a absolute -left-[15vmax] -top-[20vmax] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.09),transparent_62%)]" />
      <div className="anim-glow-b absolute -bottom-[25vmax] -right-[10vmax] h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.06),transparent_60%)]" />
      <div className="anim-drift absolute -right-[6vw] top-[18vh] w-[min(46vw,560px)]">
        <svg viewBox="-4 -4 288 260" className="w-full">
          <path d="M140 0 L280 252 H199 L140 140 L80 252 H0 Z" fill="rgba(212,162,78,.025)" stroke="rgba(212,162,78,.12)" strokeWidth={1.2} />
        </svg>
      </div>
      <span className="anim-pulse-line absolute -top-[20%] right-[30%] h-[150%] w-px -skew-x-[32deg] bg-brand/15" />
      <div className="grain !opacity-[0.035]" />
    </div>
  );
}
