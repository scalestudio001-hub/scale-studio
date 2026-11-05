/** Utilidades de fecha en hora de Chile. */
export const TZ = "America/Santiago";

/** Convierte fecha "YYYY-MM-DD" + hora "HH:MM" de Chile a Date (UTC). */
export function chileToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  let guess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      })
        .formatToParts(new Date(guess))
        .map((p) => [p.type, p.value]),
    );
    const asIfUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
    guess += Date.UTC(y, m - 1, d, hh, mm) - asIfUtc;
  }
  return new Date(guess);
}

/** "YYYY-MM-DD" del día en Chile. */
export function chileDateKey(d: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** Día de la semana en Chile (0 = domingo). */
export function chileWeekday(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const fmtDay = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-CL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

export const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString("es-CL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const fmtDateTime = (d: string | Date) => `${fmtDay(d)} · ${fmtTime(d)}`;

export function addDaysKey(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** ISO de "ahora + ms" (para filtros de fechas). */
export const isoFromNow = (ms = 0) => new Date(Date.now() + ms).toISOString();
