import { requireAdmin } from "@/lib/auth";
import { AdminTabs } from "./admin-tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <p className="eyebrow mb-4">Administración</p>
      <AdminTabs />
      {children}
    </>
  );
}
