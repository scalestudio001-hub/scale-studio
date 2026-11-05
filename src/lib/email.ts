import "server-only";
import nodemailer from "nodemailer";
import { SITE_NAME } from "@/lib/utils";

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

const transporter =
  user && pass
    ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } })
    : null;

/** Envía un correo. Si Gmail no está configurado, no hace nada (no rompe la app). */
export async function sendEmail({ to, bcc, subject, html }: { to?: string; bcc?: string[]; subject: string; html: string }) {
  if (!transporter) {
    console.warn("[email] Gmail no configurado: no se envió", subject);
    return false;
  }
  try {
    await transporter.sendMail({ from: `"${SITE_NAME}" <${user}>`, to: to ?? user, bcc, subject, html });
    return true;
  } catch (e) {
    console.error("[email] error:", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Plantilla con el estilo Scale Studio (carbón y dorado). */
function layout({ eyebrow, title, accent, body, cta, ctaUrl }: { eyebrow: string; title: string; accent?: string; body: string; cta?: string; ctaUrl?: string }) {
  const [first, ...rest] = SITE_NAME.split(" ");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#0E0E0E;font-family:Arial,Helvetica,sans-serif;color:#F3F2EE">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0E0E0E;padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#171717;border:1px solid #2a2a2a">
<tr><td style="height:4px;background:linear-gradient(90deg,#8A6420,#D4A24E,#E8C27A);background-color:#D4A24E"></td></tr>
<tr><td style="padding:32px 36px 8px"><span style="font-weight:800;font-size:22px;letter-spacing:-.3px;color:#F3F2EE">${esc(first.toUpperCase())}</span>
<span style="font-family:Georgia,serif;font-style:italic;font-size:17px;color:#F3F2EE"> ${esc(rest.join(" "))}</span></td></tr>
<tr><td style="padding:24px 36px 0"><p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#D4A24E;font-weight:bold">— ${esc(eyebrow)}</p>
<h1 style="margin:14px 0 0;font-size:34px;line-height:1;text-transform:uppercase;letter-spacing:-.5px;color:#F3F2EE">${title}</h1>
${accent ? `<p style="margin:6px 0 0;font-family:Georgia,serif;font-style:italic;font-size:24px;color:#D4A24E">${accent}</p>` : ""}</td></tr>
<tr><td style="padding:22px 36px 0;font-size:15px;line-height:1.6;color:#d6d4ce">${body}</td></tr>
${cta && ctaUrl ? `<tr><td style="padding:28px 36px 0"><a href="${ctaUrl}" style="display:inline-block;background:#D4A24E;color:#0E0E0E;text-decoration:none;font-weight:bold;font-size:15px;padding:15px 26px;border-radius:6px">${esc(cta)} →</a></td></tr>` : ""}
<tr><td style="padding:36px 36px 30px;font-size:12px;color:#7d7a73;border-top:1px solid #2a2a2a;margin-top:30px">
<p style="margin:24px 0 0">${esc(SITE_NAME)} · Hecho en Chile</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function welcomeEmail(name: string) {
  const n = esc(name.split(" ")[0] || "");
  return {
    subject: `¡Bienvenido/a a ${SITE_NAME}! 🚀`,
    html: layout({
      eyebrow: "Bienvenida",
      title: `¡Hola${n ? `, ${n}` : ""}!`,
      accent: "Ya eres parte de la comunidad.",
      body: `<p style="margin:0 0 14px">Gracias por registrarte en la plataforma de ${esc(SITE_NAME)} 🙌</p>
<p style="margin:0 0 14px">Tu cuenta quedó creada y <b style="color:#F3F2EE">está en revisión</b>. Apenas el equipo la apruebe te vamos a avisar por este mismo correo y vas a poder entrar a tus cursos, la comunidad y el chat.</p>
<p style="margin:0">Mientras tanto, guarda este correo: el link de abajo es tu acceso a la plataforma.</p>`,
      cta: "Ir a la plataforma",
      ctaUrl: `${SITE_URL}/login`,
    }),
  };
}

export function approvalEmail(name: string, planName?: string | null) {
  const n = esc(name.split(" ")[0] || "");
  return {
    subject: `✅ Tu cuenta en ${SITE_NAME} fue aprobada`,
    html: layout({
      eyebrow: "Cuenta aprobada",
      title: `¡Listo${n ? `, ${n}` : ""}!`,
      accent: "Ya puedes empezar.",
      body: `<p style="margin:0 0 14px">Tu cuenta fue aprobada${planName ? ` con el plan <b style="color:#D4A24E">${esc(planName)}</b>` : ""} 🎉</p>
<p style="margin:0 0 14px">Ya tienes acceso a:</p>
<p style="margin:0 0 6px">📚 &nbsp;Tus cursos, con tu avance guardado</p>
<p style="margin:0 0 6px">📣 &nbsp;La comunidad para compartir dudas y logros</p>
<p style="margin:0 0 14px">💬 &nbsp;El chat grupal en vivo</p>
<p style="margin:0">Entra con el correo y la clave con que te registraste.</p>`,
      cta: "Entrar a mis cursos",
      ctaUrl: `${SITE_URL}/cursos`,
    }),
  };
}

export function announcementEmail(author: string, title: string, body: string, postId: string) {
  return {
    subject: `📣 ${title}`,
    html: layout({
      eyebrow: `Nueva publicación de ${author}`,
      title: esc(title),
      body: `<p style="margin:0;white-space:pre-line">${esc(body.slice(0, 1200))}${body.length > 1200 ? "…" : ""}</p>`,
      cta: "Ver en la comunidad",
      ctaUrl: `${SITE_URL}/comunidad/${postId}`,
    }),
  };
}
