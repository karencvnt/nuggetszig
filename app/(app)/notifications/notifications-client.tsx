"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string | Date;
};

export default function NotificationsClient({ notifications: initial }: { notifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Notificações</h1>
          {unread > 0 && <p className="text-sm text-neutral-500 mt-0.5">{unread} não lida{unread > 1 ? "s" : ""}</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline">
            <CheckCircle size={13} /> Marcar todas como lidas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <Bell size={28} className="text-neutral-300" />
          </div>
          <p className="text-base font-semibold text-neutral-700 mb-1">Nenhuma notificação ainda</p>
          <p className="text-sm text-neutral-400">Você verá notificações aqui quando houver atividade relevante.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const content = (
              <div className={`px-4 py-4 rounded-xl border transition-colors ${!n.isRead ? "bg-brand-50/50 border-brand-100" : "bg-white border-neutral-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800">{n.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-neutral-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <button onClick={() => markOne(n.id)} className="text-[10px] text-brand-600 hover:underline flex-shrink-0 mt-0.5">
                      Marcar como lida
                    </button>
                  )}
                </div>
              </div>
            );

            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => { if (!n.isRead) markOne(n.id); }}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
