import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { formatDate } from "@/lib/utils";

const SENTIMENT_LABEL: Record<string, string> = {
  POSITIVE: "Positivo",
  NEUTRAL: "Neutro",
  NEGATIVE: "Negativo",
};

const IMPACT_LABEL: Record<string, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
  CRITICAL: "Crítico",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "Novo",
  VALIDATED: "Validado",
  INVESTIGATING: "Investigando",
  DISCARDED: "Descartado",
  ADDRESSED: "Tratado",
};

async function loadCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      nuggets: {
        orderBy: { order: "asc" },
        include: {
          nugget: {
            include: {
              type: true,
              source: { select: { title: true } },
              tags: { include: { tag: { select: { name: true } } } },
              createdBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  const collection = await loadCollection(id);
  if (!collection) return NextResponse.json({ error: "Coleção não encontrada." }, { status: 404 });

  const nuggets = collection.nuggets.map((cn) => cn.nugget);

  if (format === "csv") {
    const header = "id,conteúdo,tipo,fonte,jornada,etapa,tags,sentimento,impacto,status,criado_por,data";
    const rows = nuggets.map((n) =>
      [
        n.id,
        `"${n.content.replace(/"/g, '""')}"`,
        n.type.name,
        `"${n.source.title.replace(/"/g, '""')}"`,
        "",
        n.journeyStage ?? "",
        n.tags.map((t) => t.tag.name).join("; "),
        n.sentiment ? SENTIMENT_LABEL[n.sentiment] ?? n.sentiment : "",
        n.impact ? IMPACT_LABEL[n.impact] ?? n.impact : "",
        STATUS_LABEL[n.status] ?? n.status,
        n.createdBy.name,
        formatDate(n.createdAt),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${collection.title.replace(/[^a-z0-9]/gi, "_")}.csv"`,
      },
    });
  }

  if (format === "markdown") {
    const lines = [`# ${collection.title}`, ""];
    if (collection.description) lines.push(`> ${collection.description}`, "");
    lines.push(`*Exportado em ${formatDate(new Date())} por ${collection.createdBy.name}*`, "", "---", "");

    for (const n of nuggets) {
      lines.push(`## [${n.type.name}]`);
      lines.push("", n.content, "");
      lines.push(
        `*Fonte: ${n.source.title}*${n.sentiment ? ` · Sentimento: ${SENTIMENT_LABEL[n.sentiment]}` : ""}${n.impact ? ` · Impacto: ${IMPACT_LABEL[n.impact]}` : ""}${n.tags.length ? ` · Tags: ${n.tags.map((t) => t.tag.name).join(", ")}` : ""}`,
        "",
        "---",
        ""
      );
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${collection.title.replace(/[^a-z0-9]/gi, "_")}.md"`,
      },
    });
  }

  if (format === "pdf") {
    const rows = nuggets
      .map(
        (n, i) => `
      <div class="nugget">
        <div class="nugget-header">
          <span class="type-badge" style="background:${n.type.color}20;color:${n.type.color}">${n.type.name}</span>
          <span class="nugget-num">#${i + 1}</span>
        </div>
        <p class="content">${n.content}</p>
        <div class="meta">
          Fonte: ${n.source.title}
          ${n.sentiment ? ` · Sentimento: ${SENTIMENT_LABEL[n.sentiment]}` : ""}
          ${n.impact ? ` · Impacto: ${IMPACT_LABEL[n.impact]}` : ""}
          ${n.tags.length ? ` · Tags: ${n.tags.map((t) => t.tag.name).join(", ")}` : ""}
          · Status: ${STATUS_LABEL[n.status] ?? n.status}
          · Por: ${n.createdBy.name} em ${formatDate(n.createdAt)}
        </div>
      </div>`
      )
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${collection.title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1d2939; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { color: #667085; font-size: 13px; margin-bottom: 32px; }
  .nugget { border: 1px solid #eaecf0; border-radius: 12px; padding: 16px; margin-bottom: 16px; break-inside: avoid; }
  .nugget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .type-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
  .nugget-num { font-size: 11px; color: #98a2b3; }
  .content { font-size: 14px; line-height: 1.6; margin: 0 0 8px; }
  .meta { font-size: 11px; color: #667085; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${collection.title}</h1>
<p class="subtitle">${nuggets.length} nuggets · Exportado em ${formatDate(new Date())} · ${collection.createdBy.name}</p>
${rows}
<script>window.onload = () => window.print();</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({ error: "Formato inválido. Use pdf, markdown ou csv." }, { status: 400 });
}
