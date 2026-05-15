import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

type Tag = { id: string; name: string; color: string };
type NuggetType = { id: string; name: string; color: string };

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  VALIDATED: "Validado",
  INVESTIGATING: "Investigando",
  DISCARDED: "Descartado",
  ADDRESSED: "Tratado",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-neutral-100 text-neutral-600",
  VALIDATED: "bg-success-50 text-success-700",
  INVESTIGATING: "bg-warning-50 text-warning-700",
  DISCARDED: "bg-neutral-100 text-neutral-400",
  ADDRESSED: "bg-brand-50 text-brand-700",
};

const SENTIMENT_EMOJI: Record<string, string> = {
  POSITIVE: "😊",
  NEUTRAL: "😐",
  NEGATIVE: "😞",
};

export interface NuggetCardData {
  id: string;
  content: string;
  type: NuggetType;
  source: { id: string; title: string };
  participant?: { id: string; code: string } | null;
  createdBy: { name: string };
  tags: { tag: Tag }[];
  status: string;
  sentiment?: string | null;
  createdAt: string | Date;
}

export function NuggetCard({ nugget, searchTerm }: { nugget: NuggetCardData; searchTerm?: string }) {
  return (
    <Link
      href={`/app/nuggets/${nugget.id}`}
      className="block bg-white border border-neutral-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: nugget.type.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <TypeBadge type={nugget.type} />
            <span className="text-xs text-neutral-300">·</span>
            <span className="text-xs text-neutral-400 truncate max-w-[180px]">{nugget.source.title}</span>
            {nugget.participant && (
              <>
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs font-mono text-neutral-400">{nugget.participant.code}</span>
              </>
            )}
            <span
              className={`ml-auto px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[nugget.status] ?? "bg-neutral-100 text-neutral-500"}`}
            >
              {STATUS_LABELS[nugget.status] ?? nugget.status}
            </span>
          </div>
          <p className="text-sm text-neutral-800 line-clamp-3">
            {searchTerm ? (
              <HighlightText text={nugget.content} term={searchTerm} />
            ) : (
              nugget.content
            )}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {nugget.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {nugget.tags.slice(0, 4).map(({ tag }) => (
                  <TagPill key={tag.id} tag={tag} />
                ))}
                {nugget.tags.length > 4 && (
                  <span className="text-xs text-neutral-400">+{nugget.tags.length - 4}</span>
                )}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 text-xs text-neutral-400 flex-shrink-0">
              {nugget.sentiment && <SentimentIcon sentiment={nugget.sentiment} />}
              <span>{nugget.createdBy.name}</span>
              <span>{formatRelativeTime(nugget.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TypeBadge({ type }: { type: NuggetType }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
      {type.name}
    </span>
  );
}

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-600">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
      {tag.name}
    </span>
  );
}

export function SentimentIcon({ sentiment }: { sentiment: string }) {
  return <span title={sentiment}>{SENTIMENT_EMOJI[sentiment] ?? ""}</span>;
}

function HighlightText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="bg-yellow-100 text-neutral-900 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
