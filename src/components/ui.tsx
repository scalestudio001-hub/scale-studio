import Link from "next/link";
import type { ReactNode } from "react";
import { initials, SITE_NAME } from "@/lib/utils";

/** Chevrón de Scale Studio */
export function Chevron({ className = "", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 280 252" aria-hidden="true" className={className}>
      <path d="M140 0 L280 252 H199 L140 140 L80 252 H0 Z" fill={fill} />
    </svg>
  );
}

/** Logo: primera palabra en mayúsculas con el chevrón en la "A", segunda en serif itálica. */
export function Logo({ className = "" }: { className?: string }) {
  const [first, ...rest] = SITE_NAME.split(" ");
  const word = first.toUpperCase();
  const a = word.indexOf("A");
  const second = rest.join(" ");
  return (
    <Link href="/" aria-label={SITE_NAME} className={`group flex items-baseline gap-2 text-ink ${className}`}>
      <span className="flex items-end text-[22px] font-extrabold leading-none tracking-tight">
        {a >= 0 ? (
          <>
            {word.slice(0, a)}
            <Chevron fill="var(--brand)" className="mx-[0.04em] mb-[0.02em] h-[0.8em] w-[0.98em] transition-transform duration-500 group-hover:-translate-y-0.5" />
            {word.slice(a + 1)}
          </>
        ) : (
          <>
            <Chevron fill="var(--brand)" className="mb-[0.02em] mr-1.5 h-[0.8em] w-[0.98em]" />
            {word}
          </>
        )}
      </span>
      {second && <span className="font-serif text-[17px] italic">{second}</span>}
    </Link>
  );
}

export function Avatar({
  name,
  url,
  size = 36,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border border-brand/40 bg-brand-soft font-display font-semibold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-dark via-brand to-brand-light transition-all" style={{ width: `${v}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-muted">{v}%</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Texto con saltos de línea y links clickeables. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      <p className="display text-2xl">{title}</p>
      {text && <p className="mt-1 max-w-md text-muted">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
