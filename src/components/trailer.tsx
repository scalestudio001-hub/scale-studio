"use client";

import { useRef, useState } from "react";

/** Video del trailer con botón de play dorado estilo Scale Studio. */
export function Trailer({ src, poster, label = "Ver trailer · 1:00" }: { src: string; poster: string; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="group relative aspect-video overflow-hidden border border-[#2B2A26] bg-black shadow-[0_40px_90px_-40px_rgba(212,162,78,.35)]">
      {/* esquinas doradas */}
      <span className="pointer-events-none absolute -left-px -top-px z-10 h-10 w-10 border-l-2 border-t-2 border-brand transition-all duration-500 group-hover:h-16 group-hover:w-16" />
      <span className="pointer-events-none absolute -bottom-px -right-px z-10 h-10 w-10 border-b-2 border-r-2 border-brand transition-all duration-500 group-hover:h-16 group-hover:w-16" />
      <video
        ref={ref}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        controls={playing}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        className="block h-full w-full object-cover"
      />
      {!playing && (
        <button
          onClick={() => ref.current?.play()}
          aria-label="Reproducir trailer"
          className="absolute inset-0 z-[5] grid cursor-pointer place-items-center bg-[radial-gradient(circle,rgba(0,0,0,.15),rgba(0,0,0,.55))]"
        >
          <span className="relative grid h-20 w-20 place-items-center rounded-full bg-brand transition-transform duration-300 hover:scale-110 sm:h-24 sm:w-24">
            <span className="absolute -inset-3 animate-ping rounded-full border-[1.5px] border-brand/60 [animation-duration:2s]" />
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-on-brand">
              <path d="M7 4.5v15l12.5-7.5z" />
            </svg>
          </span>
          <span className="absolute bottom-5 left-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-ink">{label}</span>
        </button>
      )}
    </div>
  );
}
