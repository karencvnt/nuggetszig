"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type NuggetResult = {
  id: string;
  content: string;
  type: { name: string; color: string };
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<NuggetResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(`/api/nuggets?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json();
        setResults(data.items ?? []);
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 text-sm text-neutral-400 hover:border-neutral-300 hover:text-neutral-600 transition-colors"
      >
        <Search size={14} />
        <span className="hidden md:inline">Buscar nuggets…</span>
        <span className="md:hidden">Buscar</span>
        <kbd className="ml-1 hidden md:inline text-xs bg-neutral-100 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200">
              <Search size={18} className="text-neutral-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && results.length > 0) {
                    router.push(`/app/nuggets/${results[0].id}`);
                    setOpen(false);
                  }
                }}
                placeholder="Buscar nuggets…"
                className="flex-1 text-sm outline-none text-neutral-900 placeholder-neutral-400"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-neutral-400 hover:text-neutral-600">
                  <X size={16} />
                </button>
              )}
            </div>

            {results.length > 0 ? (
              <ul className="py-2 max-h-80 overflow-y-auto divide-y divide-neutral-50">
                {results.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        router.push(`/app/nuggets/${n.id}`);
                        setOpen(false);
                      }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-neutral-50 text-left transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: n.type.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-neutral-400 font-medium mb-0.5">{n.type.name}</p>
                        <p className="text-sm text-neutral-700 line-clamp-2">{n.content}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : q && isPending ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">Buscando…</p>
            ) : q ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">
                Nenhum resultado para &ldquo;{q}&rdquo;
              </p>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-neutral-400">
                Digite para buscar nuggets
              </p>
            )}

            <div className="border-t border-neutral-100 px-4 py-2 flex items-center gap-4 text-xs text-neutral-400">
              <span>
                <kbd className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-[11px]">↵</kbd>{" "}
                abrir primeiro resultado
              </span>
              <span>
                <kbd className="font-mono bg-neutral-100 px-1 py-0.5 rounded text-[11px]">Esc</kbd>{" "}
                fechar
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
