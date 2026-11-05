import { NextResponse, type NextRequest } from "next/server";
import { requireActive } from "@/lib/auth";
import { SITE_NAME } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { supabase } = await requireActive();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) return new NextResponse("No encontrado", { status: 404 });
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => (s ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${SITE_NAME}//Eventos//ES`, "BEGIN:VEVENT",
    `UID:${e.id}@plataforma`, `DTSTAMP:${f(new Date().toISOString())}`, `DTSTART:${f(e.starts_at)}`, `DTEND:${f(e.ends_at)}`,
    `SUMMARY:${esc(e.title)}`, `DESCRIPTION:${esc(`${e.description ?? ""}${e.location_url ? `\n${e.location_url}` : ""}`)}`,
    e.location_url ? `LOCATION:${esc(e.location_url)}` : "",
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="evento.ics"` },
  });
}
