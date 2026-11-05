import { updateMeeting } from "@/app/actions/meetings";
import { ActionForm } from "@/components/forms";

/** Formulario para que el coach registre cómo fue la reunión. */
export function MeetingEditor({ m }: { m: { id: string; status: string; coach_notes: string | null; meeting_url: string | null } }) {
  return (
    <ActionForm action={updateMeeting} submitLabel="Guardar" className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr]" buttonClassName="btn-ghost h-10 sm:col-span-2 sm:justify-self-end">
      <input type="hidden" name="id" value={m.id} />
      <select name="status" defaultValue={m.status} className="input py-2 text-sm">
        <option value="agendada">Agendada</option>
        <option value="realizada">Realizada</option>
        <option value="no_asistio">No asistió</option>
        <option value="cancelada">Cancelada</option>
      </select>
      <input name="meeting_url" defaultValue={m.meeting_url ?? ""} className="input py-2 text-sm" placeholder="Link de la reunión (Meet, Zoom…)" />
      <textarea name="coach_notes" defaultValue={m.coach_notes ?? ""} className="input min-h-16 text-sm sm:col-span-2" placeholder="Notas internas: qué se vio, tareas, próximos pasos… (el alumno no las ve)" />
    </ActionForm>
  );
}
