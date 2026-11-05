export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Scale Studio";

export const COMMUNITY_CATEGORIES = ["General", "Dudas", "Logros", "Anuncios"] as const;

/** Convierte un link de Vimeo, Bunny.net o YouTube en una URL para incrustar. */
export function toEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;

  // Vimeo: vimeo.com/123456  o  vimeo.com/123456/abcdef (no listado)
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/);
  if (vimeo && !url.includes("player.vimeo.com")) {
    const [, id, hash] = vimeo;
    return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`;
  }

  // Bunny.net: video.bunnycdn.com/play/LIB/ID  ->  iframe.mediadelivery.net/embed/LIB/ID
  const bunnyPlay = url.match(/(?:video\.bunnycdn\.com|iframe\.mediadelivery\.net)\/play\/(\d+)\/([\w-]+)/);
  if (bunnyPlay) return `https://iframe.mediadelivery.net/embed/${bunnyPlay[1]}/${bunnyPlay[2]}`;

  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  // Cualquier otro link de embed (player.vimeo.com, iframe.mediadelivery.net/embed/...)
  if (url.startsWith("https://")) return url;
  return null;
}

/** "Nombre | https://link" por línea -> lista de recursos */
export function parseResources(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [a, b] = line.split("|").map((s) => s.trim());
      return b ? { label: a, href: b } : { label: a, href: a };
    })
    .filter((r) => /^https?:\/\//.test(r.href));
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "recién";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}
