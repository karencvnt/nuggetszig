import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Bell, Plus } from "lucide-react";
import Link from "next/link";
import { GlobalSearch } from "@/components/ui/global-search";
import { Sidebar } from "@/components/ui/sidebar";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const canCreate = session.user.role !== "VIEWER";

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar
        isAdmin={isAdmin}
        canCreate={canCreate}
        user={{
          name: session.user.name ?? "Usuário",
          email: session.user.email ?? "",
          squad: session.user.squad ?? "",
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0 z-30">
          <GlobalSearch />
          <div className="flex items-center gap-2">
            {canCreate && (
              <Link
                href="/app/nuggets/new"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Plus size={13} /> Nugget
              </Link>
            )}
            {/* Notification bell — fase 2 */}
            <button
              disabled
              title="Notificações — em breve"
              className="p-2 rounded-lg text-neutral-300 cursor-not-allowed"
              aria-label="Notificações (em breve)"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Main content — pb-16 accounts for mobile bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
