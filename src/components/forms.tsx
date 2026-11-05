"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type State = { error?: string; ok?: string } | undefined;

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingText = "Guardando…",
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function Message({ state }: { state: State }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="rounded-xl border border-red-900/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-300">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-2.5 text-sm text-emerald-300">
        {state.ok}
      </p>
    );
  return null;
}

/** Formulario que muestra errores/éxitos devueltos por una server action. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingText,
  className = "space-y-4",
  buttonClassName = "btn-primary w-full",
  resetOnSuccess = false,
  hideOnSuccess = false,
}: {
  action: (state: State, fd: FormData) => Promise<State>;
  children: ReactNode;
  submitLabel: string;
  pendingText?: string;
  className?: string;
  buttonClassName?: string;
  resetOnSuccess?: boolean;
  hideOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  if (state?.ok && hideOnSuccess) return <Message state={state} />;

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <Message state={state} />
      <SubmitButton className={buttonClassName} pendingText={pendingText}>
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

/** Botón que pide confirmación antes de enviar el formulario. */
export function ConfirmButton({
  children,
  message,
  className = "btn-danger",
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
