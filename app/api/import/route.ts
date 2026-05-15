import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { calculateCompletenessScore } from "@/lib/utils";
import Papa from "papaparse";
import type { Sentiment, Impact } from "@prisma/client";

const SENTIMENT_MAP: Record<string, string> = {
  positivo: "POSITIVE",
  positive: "POSITIVE",
  positif: "POSITIVE",
  neutro: "NEUTRAL",
  neutral: "NEUTRAL",
  negativo: "NEGATIVE",
  negative: "NEGATIVE",
};

const IMPACT_MAP: Record<string, string> = {
  baixo: "LOW",
  low: "LOW",
  médio: "MEDIUM",
  medio: "MEDIUM",
  medium: "MEDIUM",
  alto: "HIGH",
  high: "HIGH",
  crítico: "CRITICAL",
  critico: "CRITICAL",
  critical: "CRITICAL",
};

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (session!.user.role === "VIEWER") {
    return NextResponse.json({ error: "Sem permissão para importar." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mappingRaw = formData.get("mapping") as string | null;
  const validateOnly = formData.get("validateOnly") === "true";

  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  if (!mappingRaw) return NextResponse.json({ error: "Mapeamento não fornecido." }, { status: 400 });

  const mapping: Record<string, string> = JSON.parse(mappingRaw);
  const text = await file.text();

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json({ error: "Erro ao processar o arquivo CSV." }, { status: 400 });
  }

  if (parsed.data.length > 1000) {
    return NextResponse.json({ error: "Limite de 1000 linhas por importação." }, { status: 400 });
  }

  const [nuggetTypes, defaultSource] = await Promise.all([
    prisma.nuggetType.findMany({ where: { isActive: true } }),
    prisma.source.findFirst({
      where: { createdById: session!.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const typeMap = Object.fromEntries(nuggetTypes.map((t) => [t.name.toLowerCase(), t]));

  type RowResult = {
    row: number;
    status: "valid" | "warning" | "error";
    message?: string;
    data?: Record<string, unknown>;
  };

  const results: RowResult[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2;

    const content = (row[mapping.content] ?? "").trim();
    if (!content) {
      results.push({ row: rowNum, status: "error", message: "Conteúdo vazio" });
      continue;
    }
    if (content.length > 500) {
      results.push({ row: rowNum, status: "error", message: "Conteúdo excede 500 caracteres" });
      continue;
    }

    const typeName = (row[mapping.type] ?? "").trim().toLowerCase();
    let type = typeName ? typeMap[typeName] : null;
    let warning: string | undefined;

    if (typeName && !type) {
      type = nuggetTypes[0] ?? null;
      warning = `Tipo "${row[mapping.type]}" não reconhecido, será usado "${type?.name ?? "padrão"}"`;
    }

    if (!type) {
      results.push({ row: rowNum, status: "error", message: "Nenhum tipo de nugget disponível no sistema" });
      continue;
    }

    const sentimentRaw = (row[mapping.sentiment] ?? "").trim().toLowerCase();
    const sentiment = sentimentRaw ? (SENTIMENT_MAP[sentimentRaw] ?? null) : null;
    if (sentimentRaw && !sentiment && !warning) warning = `Sentimento "${row[mapping.sentiment]}" não reconhecido`;

    const impactRaw = (row[mapping.impact] ?? "").trim().toLowerCase();
    const impact = impactRaw ? (IMPACT_MAP[impactRaw] ?? null) : null;

    const tagNames = (row[mapping.tags] ?? "")
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    results.push({
      row: rowNum,
      status: warning ? "warning" : "valid",
      message: warning,
      data: {
        content,
        typeId: type.id,
        typeName: type.name,
        sentiment,
        impact,
        journeyStage: (row[mapping.stage] ?? "").trim() || null,
        notes: (row[mapping.notes] ?? "").trim() || null,
        tagNames,
        sourceName: (row[mapping.source] ?? "").trim() || null,
      },
    });
  }

  if (validateOnly) {
    const valid = results.filter((r) => r.status !== "error").length;
    const warnings = results.filter((r) => r.status === "warning").length;
    const errors = results.filter((r) => r.status === "error").length;
    return NextResponse.json({ valid, warnings, errors, results });
  }

  const toImport = results.filter((r) => r.status !== "error" && r.data);
  let imported = 0;
  let failed = 0;

  const BATCH = 50;
  for (let b = 0; b < toImport.length; b += BATCH) {
    const batch = toImport.slice(b, b + BATCH);
    for (const item of batch) {
      const d = item.data!;
      try {
        let sourceId = defaultSource?.id;

        if (d.sourceName) {
          const existing = await prisma.source.findFirst({
            where: { title: { equals: d.sourceName as string, mode: "insensitive" } },
          });
          if (existing) {
            sourceId = existing.id;
          } else {
            const defaultMethod = await prisma.researchMethod.findFirst({ where: { isActive: true } });
            if (defaultMethod) {
              const created = await prisma.source.create({
                data: {
                  title: d.sourceName as string,
                  methodId: defaultMethod.id,
                  createdById: session!.user.id,
                  status: "ACTIVE",
                },
              });
              sourceId = created.id;
            }
          }
        }

        if (!sourceId) {
          const autoSource = await prisma.source.upsert({
            where: { id: "import-auto" },
            create: {
              id: "import-auto",
              title: `Importação ${new Date().toLocaleDateString("pt-BR")}`,
              methodId: (await prisma.researchMethod.findFirst({ where: { isActive: true } }))!.id,
              createdById: session!.user.id,
              status: "ACTIVE",
            },
            update: {},
          });
          sourceId = autoSource.id;
        }

        const tagOps = await Promise.all(
          (d.tagNames as string[]).map((name) =>
            prisma.tag.upsert({
              where: { name },
              create: { name, category: "Importado", color: "#667085", createdById: session!.user.id },
              update: {},
            })
          )
        );

        const nuggetData = {
          content: d.content as string,
          typeId: d.typeId as string,
          sourceId: sourceId!,
          createdById: session!.user.id,
          sentiment: (d.sentiment as Sentiment | null) ?? null,
          impact: (d.impact as Impact | null) ?? null,
          journeyStage: d.journeyStage as string | null,
          notes: d.notes as string | null,
          completenessScore: calculateCompletenessScore({
            typeId: d.typeId as string,
            sourceId: sourceId!,
            journeyId: null,
            tags: tagOps,
            sentiment: d.sentiment as string | null,
            impact: d.impact as string | null,
            evidenceUrl: null,
          }),
        };

        const nugget = await prisma.nugget.create({ data: nuggetData });

        if (tagOps.length > 0) {
          await prisma.nuggetTag.createMany({
            data: tagOps.map((tag) => ({ nuggetId: nugget.id, tagId: tag.id })),
            skipDuplicates: true,
          });
        }

        imported++;
      } catch {
        failed++;
      }
    }
  }

  return NextResponse.json({ imported, failed, total: toImport.length });
}
