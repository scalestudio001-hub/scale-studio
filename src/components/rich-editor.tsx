"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

function Btn({ on, active, title, children }: { on: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      className={`grid h-9 min-w-9 place-items-center rounded px-1.5 text-sm font-semibold transition ${active ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-6 w-px bg-line" />;

function Toolbar({ editor, onImage, uploading }: { editor: Editor; onImage: () => void; uploading: boolean }) {
  const c = () => editor.chain().focus();
  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-line bg-surface-2/95 px-2 py-1.5 backdrop-blur">
      {([1, 2, 3, 4] as const).map((l) => (
        <Btn key={l} title={`Título ${l}`} active={editor.isActive("heading", { level: l })} on={() => c().toggleHeading({ level: l }).run()}>
          H<sub className="text-[9px]">{l}</sub>
        </Btn>
      ))}
      <Sep />
      <Btn title="Negrita" active={editor.isActive("bold")} on={() => c().toggleBold().run()}><b>B</b></Btn>
      <Btn title="Cursiva" active={editor.isActive("italic")} on={() => c().toggleItalic().run()}><i className="font-serif">I</i></Btn>
      <Btn title="Subrayado" active={editor.isActive("underline")} on={() => c().toggleUnderline().run()}><u>U</u></Btn>
      <Btn title="Tachado" active={editor.isActive("strike")} on={() => c().toggleStrike().run()}><s>S</s></Btn>
      <Btn title="Código" active={editor.isActive("code")} on={() => c().toggleCode().run()}>{"</>"}</Btn>
      <Sep />
      <Btn title="Lista" active={editor.isActive("bulletList")} on={() => c().toggleBulletList().run()}>•≡</Btn>
      <Btn title="Lista numerada" active={editor.isActive("orderedList")} on={() => c().toggleOrderedList().run()}>1≡</Btn>
      <Btn title="Cita" active={editor.isActive("blockquote")} on={() => c().toggleBlockquote().run()}>❝</Btn>
      <Btn title="Bloque de código" active={editor.isActive("codeBlock")} on={() => c().toggleCodeBlock().run()}>▤</Btn>
      <Sep />
      <Btn title="Imagen" on={onImage}>{uploading ? "…" : "🖼"}</Btn>
      <Btn
        title="Link"
        active={editor.isActive("link")}
        on={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("Pega el link (déjalo vacío para quitarlo):", prev ?? "https://");
          if (url === null) return;
          if (!url || url === "https://") c().unsetLink().run();
          else c().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        🔗
      </Btn>
      <Btn title="Separador" on={() => c().setHorizontalRule().run()}>—</Btn>
      <Btn
        title="Video de YouTube"
        on={() => {
          const url = window.prompt("Link del video de YouTube:");
          if (url) c().setYoutubeVideo({ src: url }).run();
        }}
      >
        ▶
      </Btn>
      <Sep />
      <Btn title="Deshacer" on={() => c().undo().run()}>↶</Btn>
      <Btn title="Rehacer" on={() => c().redo().run()}>↷</Btn>
    </div>
  );
}

export function RichEditor({ initial, onChange, placeholder = "Escribe el contenido de la clase…" }: { initial: string; onChange: (html: string) => void; placeholder?: string }) {
  const supabase = getBrowserClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] }, link: { openOnClick: false, autolink: true } }),
      Image.configure({ HTMLAttributes: { class: "rounded-md border border-line" } }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial || "",
    editorProps: { attributes: { class: "prose-lesson min-h-[260px] px-5 py-4 outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  async function uploadImage(f?: File) {
    if (!f || !editor) return;
    setUploading(true);
    const path = `${crypto.randomUUID()}.${(f.name.split(".").pop() || "png").toLowerCase()}`;
    const { error } = await supabase.storage.from("content").upload(path, f, { contentType: f.type });
    setUploading(false);
    if (error) return alert("No se pudo subir la imagen: " + error.message);
    const { data } = supabase.storage.from("content").getPublicUrl(path);
    editor.chain().focus().setImage({ src: data.publicUrl, alt: f.name }).run();
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="rounded-md border border-line bg-bg focus-within:border-brand/60">
      {editor && <Toolbar editor={editor} onImage={() => fileInput.current?.click()} uploading={uploading} />}
      <EditorContent editor={editor} />
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
    </div>
  );
}
