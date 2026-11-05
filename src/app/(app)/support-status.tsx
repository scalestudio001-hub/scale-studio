export const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  abierto: { label: "Abierto", cls: "bg-brand text-on-brand" },
  en_proceso: { label: "En proceso", cls: "border border-sky-700/60 text-sky-400" },
  resuelto: { label: "Resuelto", cls: "border border-emerald-700/60 text-emerald-400" },
};
