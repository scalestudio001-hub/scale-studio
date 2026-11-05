import { NextResponse, type NextRequest } from "next/server";
import { fmtDay, fmtTime } from "@/lib/time";
import { STATUS_LABEL } from "../../../reuniones/status";
import { loadMeetings } from "../data";

export async function GET(req: NextRequest) {
  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { rows } = await loadMeetings(sp);
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Fecha", "Hora", "Alumno", "Coach", "Tema", "Estado", "Notas del coach", "Link"].map(esc).join(";"),
    ...rows.map((r) =>
      [fmtDay(r.starts_at), fmtTime(r.starts_at), r.student?.full_name ?? "", r.coach?.full_name ?? "", r.topic, STATUS_LABEL[r.status]?.label ?? r.status, r.coach_notes ?? "", r.meeting_url ?? ""]
        .map(esc)
        .join(";"),
    ),
  ];
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reuniones.csv"`,
    },
  });
}
