"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Plus,
} from "lucide-react";
import { signOut } from "next-auth/react";

type UserInfo = { name: string; email: string; squad?: string };

const SIDEBAR_KEY = "sidebar-collapsed";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
}

function NavLink({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const base =
    "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors";
  const activeClass = active
    ? "bg-brand-50 text-brand-700"
    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900";
  const disabledClass = item.disabled ? "opacity-40 pointer-events-none" : "";

  const tooltip = collapsed && (
    <span className="absolute left-full ml-3 px-2 py-1 text-xs bg-neutral-900 text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
      {item.label}
      {item.disabled && " (em breve)"}
    </span>
  );

  const inner = (
    <>
      <item.Icon size={18} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.disabled && (
        <span className="ml-auto text-[10px] text-neutral-400 font-normal">em breve</span>
      )}
      {tooltip}
    </>
  );

  if (item.disabled) {
    return (
      <div className={`${base} ${activeClass} ${disabledClass} ${collapsed ? "justify-center" : ""}`}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      className={`${base} ${activeClass} ${collapsed ? "justify-center" : ""}`}
    >
      {inner}
    </Link>
  );
}

export function Sidebar({
  isAdmin,
  canCreate,
  user,
}: {
  isAdmin: boolean;
  canCreate: boolean;
  user: UserInfo;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }

  function isActive(href: string) {
    if (href === "/app/nuggets")
      return pathname === "/app/nuggets" || pathname.startsWith("/app/nuggets/");
    if (href === "/app/admin/taxonomy")
      return pathname.startsWith("/app/admin");
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navItems: NavItem[] = [
    { href: "/app/nuggets", label: "Repositório", Icon: LayoutDashboard },
    { href: "/app/sources", label: "Fontes", Icon: FileText },
    { href: "/app/participants", label: "Participantes", Icon: Users },
    { href: "/app/collections", label: "Coleções", Icon: BookOpen, disabled: true },
    ...(isAdmin
      ? [{ href: "/app/admin/taxonomy", label: "Admin", Icon: Settings }]
      : []),
  ];

  const mobileItems = [
    { href: "/app/nuggets", label: "Repositório", Icon: LayoutDashboard },
    { href: "/app/sources", label: "Fontes", Icon: FileText },
    { href: "/app/participants", label: "Participantes", Icon: Users },
    ...(isAdmin
      ? [{ href: "/app/admin/taxonomy", label: "Admin", Icon: Settings }]
      : []),
  ];

  // Avoid hydration mismatch — don't render the collapsed state until mounted
  const effectiveCollapsed = mounted ? collapsed : false;

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 h-screen bg-white border-r border-neutral-200 transition-all duration-200 ${
          effectiveCollapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo row */}
        <div
          className={`flex items-center h-14 flex-shrink-0 border-b border-neutral-200 ${
            effectiveCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          {effectiveCollapsed ? (
            <Link
              href="/app/nuggets"
              className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm"
            >
              N
            </Link>
          ) : (
            <Link href="/app/nuggets" className="font-bold text-neutral-900 text-sm">
              Nuggets
            </Link>
          )}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            title={effectiveCollapsed ? "Expandir" : "Recolher"}
          >
            {effectiveCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={effectiveCollapsed}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-neutral-200 p-3 ${effectiveCollapsed ? "flex justify-center" : ""}`}>
          {effectiveCollapsed ? (
            <div
              className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold"
              title={user.name}
            >
              {user.name[0]?.toUpperCase()}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold flex-shrink-0">
                  {user.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{user.name}</p>
                  {user.squad && (
                    <p className="text-xs text-neutral-400 truncate">{user.squad}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/app/account"
                  className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 rounded-lg transition-colors"
                >
                  <User size={12} /> Perfil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex-1 flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 hover:text-error-600 rounded-lg transition-colors"
                >
                  <LogOut size={12} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-neutral-200 flex items-center justify-around px-2 py-1">
        {mobileItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
              isActive(item.href) ? "text-brand-700" : "text-neutral-400 hover:text-neutral-700"
            }`}
          >
            <item.Icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        {canCreate && (
          <Link
            href="/app/nuggets/new"
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-brand-700 transition-colors"
          >
            <Plus size={20} />
            <span className="text-[10px] font-medium">Novo</span>
          </Link>
        )}
      </nav>
    </>
  );
}
