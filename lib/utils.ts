import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay < 7) return `há ${diffDay} dia${diffDay > 1 ? "s" : ""}`;
  return formatDate(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateParticipantCode(count: number): string {
  return `P${String(count + 1).padStart(3, "0")}`;
}

export function calculateCompletenessScore(nugget: {
  typeId?: string | null;
  sourceId?: string | null;
  journeyId?: string | null;
  tags?: unknown[];
  sentiment?: string | null;
  impact?: string | null;
  evidenceUrl?: string | null;
}): number {
  let score = 0;
  if (nugget.typeId) score += 20;
  if (nugget.sourceId) score += 20;
  if (nugget.journeyId) score += 15;
  if (nugget.tags && nugget.tags.length > 0) score += 15;
  if (nugget.sentiment) score += 10;
  if (nugget.impact) score += 10;
  if (nugget.evidenceUrl) score += 10;
  return score;
}

export function getCompletenessLabel(score: number): "Incompleto" | "Básico" | "Completo" {
  if (score <= 40) return "Incompleto";
  if (score <= 70) return "Básico";
  return "Completo";
}
