import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-neutral-200 px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <nav className="flex items-center gap-1">
          <Link href="/app" className="font-bold text-neutral-900 mr-4 text-sm">Nuggets</Link>
          <NavLink href="/app">Repositório</NavLink>
          <NavLink href="/app/sources">Fontes</NavLink>
          <NavLink href="/app/participants">Participantes</NavLink>
          {isAdmin && <NavLink href="/app/admin/taxonomy">Admin</NavLink>}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/app/account" className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
              {(session.user.name ?? "?")[0].toUpperCase()}
            </div>
            <span className="hidden sm:inline">{session.user.name}</span>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors">
      {children}
    </Link>
  );
}
