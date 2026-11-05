import { Chevron, Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-black px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[20vmax] -top-[25vmax] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle,rgba(212,162,78,.14),transparent_62%)]" />
        <Chevron fill="rgba(212,162,78,.035)" className="absolute -bottom-[10%] -right-[8%] w-[min(70vw,760px)] stroke-brand/40 [stroke-width:1.5]" />
      </div>
      <div className="relative w-full max-w-md">
        <Logo className="mb-10 justify-center" />
        <div className="card p-6 shadow-2xl shadow-black/60 sm:p-9">
          <span className="absolute inset-x-0 top-0 h-[3px] rounded-t-md bg-gradient-to-r from-brand-dark via-brand to-brand-light" />
          {children}
        </div>
      </div>
    </div>
  );
}
