"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | undefined>(undefined);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function fetchCount() {
    const res = await fetch("/api/notifications?unread=true&limit=0");
    if (res.ok) {
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    const res = await fetch("/api/notifications?limit=20");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
    setLoading(false);
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function toggle() {
    if (!open) fetchNotifications();
    setOpen((o) => !o);
  }

  return (
    <div className="relative" ref={(el) => { ref.current = el ?? undefined; }}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-error-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <span className="text-sm font-semibold text-neutral-800">Notificações</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-neutral-400">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">Nenhuma notificação ainda.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead(n.id); if (n.link) setOpen(false); }}
                  className={`px-4 py-3 border-b border-neutral-50 last:border-0 cursor-pointer hover:bg-neutral-50 transition-colors ${!n.isRead ? "bg-brand-50/40" : ""}`}
                >
                  {n.link ? (
                    <Link href={n.link} className="block">
                      <NotifContent n={n} />
                    </Link>
                  ) : (
                    <NotifContent n={n} />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-neutral-100 text-center">
            <Link href="/app/notifications" onClick={() => setOpen(false)} className="text-xs text-brand-600 hover:underline">
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifContent({ n }: { n: Notification }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-neutral-800">{n.title}</p>
        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 mt-1" />}
      </div>
      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
      <p className="text-[10px] text-neutral-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
    </>
  );
}
