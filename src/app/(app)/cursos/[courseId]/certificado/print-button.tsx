"use client";
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      ⬇ Descargar PDF / Imprimir
    </button>
  );
}
