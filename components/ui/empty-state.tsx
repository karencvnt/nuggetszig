import { Search, FileText, Users, BookOpen } from "lucide-react";
import Link from "next/link";

type EmptyVariant = "nuggets" | "sources" | "participants" | "search" | "default";

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  action?: { label: string; href: string };
  onClear?: () => void;
  clearLabel?: string;
}

const VARIANTS: Record<
  EmptyVariant,
  { Icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description: string }
> = {
  nuggets: {
    Icon: Search,
    title: "Nenhum nugget ainda",
    description: "Comece registrando insights das suas pesquisas.",
  },
  sources: {
    Icon: FileText,
    title: "Nenhuma fonte ainda",
    description: "Registre entrevistas, surveys e outros métodos de pesquisa.",
  },
  participants: {
    Icon: Users,
    title: "Nenhum participante ainda",
    description: "Adicione participantes das suas pesquisas.",
  },
  search: {
    Icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente remover alguns filtros ou ajustar sua busca.",
  },
  default: {
    Icon: BookOpen,
    title: "Nada aqui ainda",
    description: "Este espaço está vazio por enquanto.",
  },
};

export function EmptyState({
  variant = "default",
  title,
  description,
  action,
  onClear,
  clearLabel = "Limpar filtros",
}: EmptyStateProps) {
  const { Icon, title: defaultTitle, description: defaultDesc } = VARIANTS[variant];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-neutral-300" />
      </div>
      <p className="text-base font-semibold text-neutral-700 mb-1">{title ?? defaultTitle}</p>
      <p className="text-sm text-neutral-400 mb-5 max-w-xs">{description ?? defaultDesc}</p>
      <div className="flex items-center gap-3">
        {onClear && (
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            {clearLabel}
          </button>
        )}
        {action && (
          <Link
            href={action.href}
            className="px-4 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
