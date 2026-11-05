import { Logo } from "@/components/ui";
import { AuthBackground } from "@/components/backgrounds";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-black px-4 py-10">
      <AuthBackground />
      <div className="relative w-full max-w-md">
        <div className="anim-fade-up">
          <Logo className="mb-10 justify-center" />
        </div>
        <div className="card anim-fade-up p-6 shadow-2xl shadow-black/60 backdrop-blur-sm [animation-delay:.15s] sm:p-9 bg-surface/90">
          <span className="absolute inset-x-0 top-0 h-[3px] origin-left rounded-t-md bg-gradient-to-r from-brand-dark via-brand to-brand-light [animation:grow-x_1s_.6s_cubic-bezier(.16,1,.3,1)_both]" />
          <div className="page-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
