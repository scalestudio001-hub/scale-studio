# Plataforma de cursos — estilo Scale Studio

Una plataforma propia tipo Skool: los alumnos se registran, entran con su clave, ven los cursos de su plan, marcan su avance y participan en la comunidad. El equipo aprueba a cada alumno y administra todo desde el panel, sin tocar código.

**Tecnología:** Next.js 16 (en Vercel) + Supabase (login y base de datos). Los dos tienen plan gratis para partir.

---

## Qué incluye

| Para el alumno | Para el equipo (admin) |
|---|---|
| Registro con nombre, correo, WhatsApp y clave | Aprobar, pausar o bloquear alumnos |
| Inicio de sesión y recuperar clave por correo | Asignar un plan a cada alumno |
| Pantalla "cuenta en revisión" hasta que lo aprueben | Crear planes y elegir qué cursos incluye cada uno |
| Sus cursos con barra de avance (los otros salen con candado) | Crear cursos, módulos y clases |
| Clases con video (Vimeo / Bunny.net), descripción y recursos | Publicar o dejar en borrador |
| Marcar clase como completada y botón "Siguiente clase" | Fijar o borrar publicaciones de la comunidad |
| Comunidad: publicar, comentar, dar like, filtrar por categoría | Ver correo y WhatsApp de cada alumno (link directo) |
| Perfil: nombre, foto y cambio de clave | |

La seguridad está en la base de datos: aunque alguien copie un link, solo ve las clases si el curso está en su plan.

---

## Puesta en marcha (≈ 20 minutos)

### 1. Crear el proyecto en Supabase
1. Entra a [supabase.com](https://supabase.com) → **New project**. Región: *South America (São Paulo)*.
2. Ve a **SQL Editor → New query**, pega todo el archivo `supabase/schema.sql` y presiona **Run**. Debe decir *Success*.
3. Ve a **Authentication → Sign In / Providers → Email** y **desactiva "Confirm email"**.
   *(Recomendado: igual ustedes aprueban a cada alumno, así no se pierden registros por correos que caen en spam.)*
4. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public` key

### 2. Publicar en Vercel
1. Sube esta carpeta a un repositorio de GitHub (o pídele a Claude que la publique).
2. En Vercel → **Add New → Project** → importa el repositorio.
3. En **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | el Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la anon key |
   | `NEXT_PUBLIC_SITE_NAME` | `Scale Studio` (o el nombre que quieran) |
   | `NEXT_PUBLIC_SITE_URL` | la URL final, ej. `https://academia.scalestudio.cl` |

4. **Deploy**.

### 3. Conectar la URL en Supabase
En **Authentication → URL Configuration**:
- **Site URL:** tu URL final (ej. `https://academia.scalestudio.cl`)
- **Redirect URLs:** agrega `https://academia.scalestudio.cl/**`

Esto hace que funcione el correo de "recuperar clave".

### 4. Hacerte admin
1. Entra a la plataforma y **regístrate** con tu correo.
2. En Supabase → SQL Editor, corre (con tu correo):
   ```sql
   update public.profiles set role = 'admin', status = 'active'
   where id = (select id from auth.users where email = 'tu@correo.com');
   ```
3. Actualiza la página: ahora ves el menú **Administración**. Desde ahí puedes hacer admin a otros coaches sin volver a usar SQL.

---

## Uso diario

1. **Administración → Planes:** crea los planes (ej. Despegue, Rentabilidad, Escala).
2. **Administración → Cursos:** crea un curso → agrega módulos → agrega clases → marca **Publicado**.
3. **Planes:** marca qué cursos incluye cada plan.
4. **Alumnos:** cuando alguien se registra aparece arriba como *Pendiente*. Elige su plan y presiona **Aprobar**.

### Videos
Pega el link normal del video y la plataforma lo incrusta sola:
- Vimeo: `https://vimeo.com/123456789` (o `https://vimeo.com/123456789/abc123` si es no listado)
- Bunny.net: `https://iframe.mediadelivery.net/embed/LIBRERIA/ID` o el link de "play"

**Importante:** en Vimeo → *Privacidad → Dónde se puede insertar* → elige "Solo en dominios específicos" y agrega tu dominio. En Bunny → *Stream → Security* → activa "Allowed domains". Así nadie puede ver los videos fuera de la plataforma.

### Recursos de una clase
Uno por línea, con el formato `Nombre | link`:
```
Planilla de costeo | https://docs.google.com/spreadsheets/d/...
Presentación de la clase | https://drive.google.com/...
```

---

## Personalizar el diseño
- **Colores:** `src/app/globals.css`, al inicio (carbón `#0E0E0E`, papel `#F3F2EE`, dorado `#D4A24E`).
- **Nombre y logo:** variable `NEXT_PUBLIC_SITE_NAME`. El logo pone la primera palabra en mayúsculas con el chevrón dorado en la "A" y la segunda palabra en itálica (ej. SC▲LE *Studio*).
- **Categorías de la comunidad:** `src/lib/utils.ts` → `COMMUNITY_CATEGORIES`.

## Probar en tu computador
```bash
npm install
cp .env.example .env.local   # y completa los datos de Supabase
npm run dev                  # abre http://localhost:3000
```
