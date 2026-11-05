export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  agendada: { label: "Agendada", cls: "bg-brand text-on-brand" },
  realizada: { label: "Realizada", cls: "border border-emerald-700/60 text-emerald-400" },
  cancelada: { label: "Cancelada", cls: "border border-line text-muted" },
  no_asistio: { label: "No asistió", cls: "border border-red-800/60 text-red-400" },
};

export function StatusChip({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.agendada;
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
}
