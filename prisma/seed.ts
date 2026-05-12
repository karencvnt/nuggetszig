import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Admin user ─────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@nuggets.app" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@nuggets.app",
      password: adminPassword,
      role: "ADMIN",
      emailVerified: new Date(),
      isActive: true,
    },
  });

  console.log(`✅ Usuário admin criado: ${admin.email}`);

  // ─── Nugget types ────────────────────────────────────────────────────────────
  const nuggetTypes = [
    { name: "Insight", color: "#6172f3", icon: "lightbulb", order: 0 },
    { name: "Problema", color: "#f04438", icon: "exclamation-triangle", order: 1 },
    { name: "Oportunidade", color: "#12b76a", icon: "arrow-trending-up", order: 2 },
    { name: "Comportamento", color: "#f79009", icon: "user", order: 3 },
    { name: "Citação", color: "#9e77ed", icon: "chat-bubble-left-right", order: 4 },
    { name: "Dado quantitativo", color: "#0086c9", icon: "chart-bar", order: 5 },
    { name: "Sinal", color: "#ee46bc", icon: "signal", order: 6 },
    { name: "Ponto positivo", color: "#17b26a", icon: "hand-thumb-up", order: 7 },
  ];

  for (const type of nuggetTypes) {
    await prisma.nuggetType.upsert({
      where: { name: type.name },
      update: {},
      create: {
        ...type,
        createdById: admin.id,
      },
    });
  }

  console.log(`✅ ${nuggetTypes.length} tipos de nugget criados`);

  // ─── Research methods ────────────────────────────────────────────────────────
  const methods = [
    { name: "Entrevista em profundidade", category: "qualitativo", description: "Entrevistas individuais com usuários ou stakeholders" },
    { name: "Teste de usabilidade", category: "qualitativo", description: "Observação de usuários interagindo com o produto" },
    { name: "Discovery/Workshop", category: "qualitativo", description: "Sessões colaborativas de descoberta e ideação" },
    { name: "Survey", category: "quantitativo", description: "Questionários estruturados para coleta em escala" },
    { name: "NPS/CSAT", category: "quantitativo", description: "Métricas de satisfação e lealdade do cliente" },
    { name: "Analytics", category: "quantitativo", description: "Análise de dados comportamentais do produto" },
    { name: "Experimento A/B", category: "quantitativo", description: "Testes controlados de variantes do produto" },
    { name: "Benchmarking", category: "desk research", description: "Análise comparativa com concorrentes ou referências de mercado" },
    { name: "Insumos SAC", category: "qualitativo", description: "Análise de tickets, reclamações e feedbacks de atendimento" },
    { name: "Desk Research", category: "desk research", description: "Pesquisa documental, artigos, relatórios e estudos secundários" },
  ];

  for (const method of methods) {
    await prisma.researchMethod.upsert({
      where: { name: method.name },
      update: {},
      create: {
        ...method,
        createdById: admin.id,
      },
    });
  }

  console.log(`✅ ${methods.length} métodos de pesquisa criados`);

  // ─── Tags de exemplo ─────────────────────────────────────────────────────────
  const tags = [
    // Categoria: Produto
    { name: "Onboarding", category: "Produto", color: "#6172f3" },
    { name: "Performance", category: "Produto", color: "#6172f3" },
    { name: "Notificações", category: "Produto", color: "#6172f3" },
    // Categoria: Jornada
    { name: "Ativação", category: "Jornada", color: "#f79009" },
    { name: "Retenção", category: "Jornada", color: "#f79009" },
    { name: "Churn", category: "Jornada", color: "#f79009" },
    // Categoria: Segmento
    { name: "Enterprise", category: "Segmento", color: "#12b76a" },
    { name: "PME", category: "Segmento", color: "#12b76a" },
    { name: "Freemium", category: "Segmento", color: "#12b76a" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: {
        ...tag,
        createdById: admin.id,
      },
    });
  }

  console.log(`✅ ${tags.length} tags de exemplo criadas`);

  // ─── Journey de exemplo ──────────────────────────────────────────────────────
  const journeyExists = await prisma.journey.findFirst({
    where: { name: "Jornada do Cliente" },
  });

  if (!journeyExists) {
    await prisma.journey.create({
      data: {
        name: "Jornada do Cliente",
        description: "Jornada padrão do cliente desde o discovery até a fidelização",
        color: "#6172f3",
        stages: ["Descoberta", "Consideração", "Ativação", "Adoção", "Expansão", "Fidelização"],
        createdById: admin.id,
      },
    });
    console.log("✅ Jornada de exemplo criada");
  }

  // ─── Segmentos de exemplo ────────────────────────────────────────────────────
  const segments = [
    { name: "Enterprise", description: "Empresas com mais de 500 funcionários" },
    { name: "Mid-market", description: "Empresas com 50 a 500 funcionários" },
    { name: "SMB", description: "Pequenas e médias empresas com até 50 funcionários" },
  ];

  for (const segment of segments) {
    await prisma.segment.upsert({
      where: { name: segment.name },
      update: {},
      create: {
        ...segment,
        createdById: admin.id,
      },
    });
  }

  console.log(`✅ ${segments.length} segmentos criados`);

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("─────────────────────────────────────");
  console.log("Login de admin:");
  console.log("  E-mail: admin@nuggets.app");
  console.log("  Senha:  Admin@123");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
