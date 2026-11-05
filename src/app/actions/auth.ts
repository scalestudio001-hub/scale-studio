"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { str } from "@/lib/utils";

export type FormState = { error?: string; ok?: string } | undefined;

function traducir(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Correo o clave incorrectos.";
  if (m.includes("email not confirmed")) return "Primero confirma tu correo (revisa tu bandeja de entrada o spam).";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene una cuenta. Inicia sesión o recupera tu clave.";
  if (m.includes("password should be") || m.includes("at least"))
    return "La clave debe tener al menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  if (m.includes("same password")) return "La nueva clave debe ser distinta a la anterior.";
  return "Ocurrió un error: " + msg;
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/cursos";
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!email || !password) return { error: "Ingresa tu correo y tu clave." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traducir(error.message) };

  redirect(safeNext(str(fd, "next")));
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const full_name = str(fd, "full_name");
  const phone = str(fd, "phone");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const password2 = str(fd, "password2");

  if (!full_name || !email || !password) return { error: "Completa nombre, correo y clave." };
  if (password.length < 6) return { error: "La clave debe tener al menos 6 caracteres." };
  if (password !== password2) return { error: "Las claves no coinciden." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone },
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/pendiente`,
    },
  });
  if (error) return { error: traducir(error.message) };

  // Si Supabase pide confirmar correo, todavía no hay sesión
  if (!data.session) {
    return { ok: "¡Listo! Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam." };
  }
  redirect("/pendiente");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  if (!email) return { error: "Ingresa tu correo." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/nueva-clave`,
  });
  if (error) return { error: traducir(error.message) };
  return { ok: "Si el correo está registrado, te llegará un link para crear una clave nueva." };
}

export async function updatePassword(_: FormState, fd: FormData): Promise<FormState> {
  const password = str(fd, "password");
  const password2 = str(fd, "password2");
  if (password.length < 6) return { error: "La clave debe tener al menos 6 caracteres." };
  if (password !== password2) return { error: "Las claves no coinciden." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traducir(error.message) };
  return { ok: "Clave actualizada ✅" };
}
