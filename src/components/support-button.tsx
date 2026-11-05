"use client";

import { useState } from "react";
import Link from "next/link";
import { Headset, X, ChevronRight, PenLine } from "lucide-react";
import { createTicket } from "@/app/actions/extras";
import { ActionForm } from "@/components/forms";

export type SupportTopic = {
  id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  contact_name: string | null;
  whatsapp: string | null;
};

export function SupportButton({ topics, userName }: { topics: SupportTopic[]; userName: string }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<SupportTopic | null>(null);
  const [form, setForm] = useState(false);

  const close = () => {
    setOpen(false);
    setTopic(null);
    setForm(false);
  };
  const wa = (t: SupportTopic) =>
    `https://wa.me/${t.whatsapp}?text=${encodeURIComponent(`Hola${t.contact_name ? ` ${t.contact_name.split(" ")[0]}` : ""}! Soy ${userName}, te escribo desde la plataforma por: ${t.label}.`)}`;

  return (
    <>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Soporte"
        className="group fixed bottom-5 right-5 z-[65] flex h-14 items-center gap-2 rounded-full bg-brand pl-4 pr-5 font-semibold text-on-brand shadow-[0_12px_40px_-10px_rgba(212,162,78,.8)] transition hover:-translate-y-0.5 hover:bg-brand-light"
      >
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand/40 [animation-duration:3s]" />
        {open ? <X strokeWidth={2} className="h-5 w-5" /> : <Headset strokeWidth={1.8} className="h-5 w-5" />}
        <span className="hidden text-sm sm:inline">{open ? "Cerrar" : "Soporte"}</span>
      </button>

      {open && (
        <div className="anim-fade-up fixed bottom-24 right-5 z-[65] w-[min(380px,calc(100vw-2.5rem))] overflow-hidden rounded-md border border-line bg-surface shadow-2xl shadow-black/70 [animation-duration:.3s]">
          <div className="relative overflow-hidden bg-black px-5 py-5">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-dark via-brand to-brand-light" />
            <div aria-hidden className="anim-glow-a absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.3),transparent_62%)]" />
            <p className="relative font-display text-2xl font-semibold uppercase leading-none">¿En qué te ayudamos?</p>
            <p className="relative mt-1.5 font-serif text-[15px] italic text-brand">Elige un tema y te conectamos con quien corresponde.</p>
          </div>

          <div className="max-h-[55vh] overflow-y-auto p-3">
            {!topic && !form && (
              <div className="space-y-1.5">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTopic(t)}
                    className="flex w-full items-center gap-3 rounded-md border border-line px-3 py-3 text-left transition hover:border-brand hover:bg-brand-soft"
                  >
                    <span className="text-xl">{t.emoji || "💬"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{t.label}</span>
                      {t.description && <span className="block truncate text-xs text-muted">{t.description}</span>}
                    </span>
                    <ChevronRight strokeWidth={1.6} className="h-4 w-4 text-brand/70" />
                  </button>
                ))}
                {topics.length === 0 && <p className="p-3 text-sm text-muted">Escríbenos dejando una solicitud.</p>}
                <button onClick={() => setForm(true)} className="mt-2 w-full rounded-md px-3 py-2.5 text-center text-sm font-semibold text-brand hover:bg-surface-2">
                  <PenLine strokeWidth={1.6} className="mr-1.5 inline h-4 w-4" />Dejar una solicitud escrita
                </button>
                <Link href="/soporte" onClick={close} className="block rounded-md px-3 py-2 text-center text-xs text-muted hover:text-ink">
                  Ver mis solicitudes
                </Link>
              </div>
            )}

            {topic && !form && (
              <div className="space-y-3 p-1">
                <button onClick={() => setTopic(null)} className="text-xs text-muted hover:text-ink">← Volver</button>
                <p className="text-lg font-semibold">
                  {topic.emoji} {topic.label}
                </p>
                {topic.description && <p className="text-sm text-muted">{topic.description}</p>}
                {topic.whatsapp && (
                  <a href={wa(topic)} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#25D366] text-black hover:brightness-110">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2c.2-.6.2-1 .2-1.2l-.5-.3Z" /></svg>
                    Escribir por WhatsApp{topic.contact_name ? ` a ${topic.contact_name.split(" ")[0]}` : ""}
                  </a>
                )}
                <button onClick={() => setForm(true)} className="btn-ghost w-full"><PenLine strokeWidth={1.6} className="h-4 w-4 text-brand" />Dejar una solicitud escrita</button>
              </div>
            )}

            {form && (
              <div className="p-1">
                <button onClick={() => setForm(false)} className="mb-3 text-xs text-muted hover:text-ink">← Volver</button>
                <ActionForm action={createTicket} submitLabel="Enviar solicitud" pendingText="Enviando…" className="space-y-3" hideOnSuccess>
                  <select name="topic_id" defaultValue={topic?.id ?? ""} className="input py-2 text-sm">
                    <option value="">Tema (opcional)</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                  <input name="subject" className="input" placeholder="Asunto" maxLength={140} required />
                  <textarea name="message" className="input min-h-28" placeholder="Cuéntanos qué pasa con el mayor detalle posible" maxLength={3000} required />
                </ActionForm>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
