"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface FilterSelectProps {
  name: string;
  label: string;
  children: React.ReactNode;
}

export function FilterSelect({ name, label, children }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(name) ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set(name, e.target.value);
    else params.delete(name);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      aria-label={label}
      value={value}
      onChange={handleChange}
      className="px-3 py-2 rounded-lg border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {children}
    </select>
  );
}
