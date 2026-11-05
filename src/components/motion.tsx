"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Hace aparecer su contenido cuando entra en pantalla. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ ["--d" as string]: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Palabra que va rotando entre varias opciones. */
export function RotatingWord({ words, interval = 2400 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setOut(true);
      setTimeout(() => {
        setI((n) => (n + 1) % words.length);
        setOut(false);
      }, 450);
    }, interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  return (
    <span className="relative inline-block overflow-hidden align-bottom text-brand">
      <span
        key={i}
        className="inline-block"
        style={{ animation: out ? "word-out .45s cubic-bezier(.2,.7,.2,1) forwards" : "word-in .7s cubic-bezier(.16,1,.3,1) forwards" }}
      >
        {words[i]}
      </span>
    </span>
  );
}

/** Cinta animada con palabras. */
export function Marquee({ items, gold = true, reverse = false }: { items: string[]; gold?: boolean; reverse?: boolean }) {
  const list = [...items, ...items, ...items, ...items];
  return (
    <div
      aria-hidden
      className={`relative z-10 overflow-hidden whitespace-nowrap border-y ${gold ? "border-black bg-brand text-on-brand" : "border-line bg-bg text-ink"}`}
    >
      <div
        className="inline-flex"
        style={{ animation: `marquee ${reverse ? 32 : 26}s linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}
      >
        {list.map((w, k) => (
          <span key={k} className="inline-flex items-center py-4 font-display text-[clamp(17px,1.8vw,24px)] font-semibold uppercase tracking-wide">
            {w}
            <svg viewBox="0 0 280 252" className={`mx-7 h-3 w-3.5 ${gold ? "fill-current" : "fill-brand"}`}>
              <path d="M140 0 L280 252 H199 L140 140 L80 252 H0 Z" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

/** El chevrón sigue suavemente al mouse (efecto parallax). */
export function Parallax({ children, strength = 18, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * strength;
        const y = (e.clientY / window.innerHeight - 0.5) * strength;
        if (ref.current) ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return (
    <div ref={ref} className={`transition-transform duration-700 ease-out ${className}`}>
      {children}
    </div>
  );
}
