import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/app");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/app" className="text-neutral-500 hover:text-neutral-900 text-sm">
              ← Voltar ao app
            </Link>
            <span className="text-neutral-300">|</span>
            <h1 className="text-base font-semibold text-neutral-900">Administração</h1>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              href="/app/admin/taxonomy"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              Taxonomia
            </Link>
            <Link
              href="/app/admin/users"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
            >
              Usuários
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
