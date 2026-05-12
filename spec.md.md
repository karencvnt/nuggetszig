# Nuggets — Prompts para Claude Code
> Use este arquivo como guia de sessões. Siga a ordem. Não pule etapas.
> Cole cada prompt no Claude Code exatamente como está, substituindo apenas o que estiver entre `[ ]`.

---

## Como usar este guia

- **Uma sessão = um épico.** Termine, valide no browser, só então avance.
- **Antes de cada sessão:** cole o "Prompt de contexto" primeiro, depois o prompt do épico.
- **Repositório:** mantenha este arquivo como `SPEC.md` na raiz do projeto — o Claude Code vai usá-lo como referência.
- **Deploy:** a cada épico concluído, faça push para o GitHub. O Vercel gera uma URL de preview automaticamente.

---

## Prompt de contexto (cole no início de TODA sessão)

```
Estou construindo uma plataforma interna chamada Nuggets — um repositório centralizado de insights, oportunidades e problemas identificados em pesquisas de produto (entrevistas, discovery, benchmarks, dados de analytics, SAC etc.).

Stack do projeto:
- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- Auth.js v5 (autenticação própria com e-mail e senha)
- Tailwind CSS
- Resend (e-mails transacionais)
- Deploy: Vercel + GitHub

Estrutura de pastas esperada:
/app → páginas e rotas (App Router)
/app/api → endpoints de API
/components → componentes reutilizáveis
/lib → funções utilitárias, cliente Prisma, helpers
/prisma → schema.prisma e migrations
/emails → templates de e-mail (React Email)

Papéis de usuário: Viewer, Contributor, Admin.

O que já foi construído nesta sessão anterior: [DESCREVA AQUI O QUE JÁ EXISTE — ou escreva "nada ainda, é a primeira sessão"].

O que vamos construir agora: [NOME DO ÉPICO DA SESSÃO].

Antes de escrever qualquer código, leia o contexto acima e confirme que entendeu o escopo.
```

---

## Sessão 0 — Setup inicial do projeto

> Execute uma única vez antes de qualquer épico.

```
Com base no contexto do projeto Nuggets (Next.js 14, TypeScript, Prisma, Supabase, Auth.js, Tailwind, Resend, Vercel), faça o setup completo do repositório:

1. Crie o projeto Next.js 14 com App Router e TypeScript:
   npx create-next-app@latest nuggets --typescript --tailwind --app --src-dir=false --import-alias="@/*"

2. Instale as dependências necessárias:
   - @prisma/client prisma
   - next-auth@beta @auth/prisma-adapter
   - @supabase/supabase-js
   - resend react-email
   - bcryptjs @types/bcryptjs
   - zod (validação de formulários)

3. Crie o arquivo .env.local com as variáveis de ambiente necessárias (com placeholders):
   DATABASE_URL=
   NEXTAUTH_SECRET=
   NEXTAUTH_URL=http://localhost:3000
   RESEND_API_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000

4. Configure o Prisma:
   - Crie prisma/schema.prisma com provider = "postgresql"
   - Adicione o modelo básico de User e Session do Auth.js (vamos expandir no próximo passo)
   - Rode: npx prisma generate

5. Crie a estrutura de pastas:
   /app/(auth) → rotas de login, registro, recuperação de senha
   /app/(app) → rotas protegidas da aplicação
   /app/api → endpoints
   /components/ui → componentes base
   /lib → prisma.ts, auth.ts, utils.ts

6. Configure o Tailwind com as cores e tokens base do design system da aplicação.

7. Crie um README.md com instruções de setup local.

Ao final, mostre a estrutura de pastas criada e confirme que o projeto roda com `npm run dev` sem erros.
```

---

## Sessão 1 — Modelo de dados completo (Prisma)

> Esta é a sessão mais importante. Tudo o mais deriva daqui.

```
Vamos criar o schema Prisma completo da plataforma Nuggets. Este é o modelo de dados central — não avance para nenhuma outra feature sem este schema estar correto e com migration rodada.

Crie o arquivo prisma/schema.prisma com os seguintes modelos:

---

### User
- id (String, uuid, @id @default(uuid()))
- name (String)
- email (String, @unique)
- emailVerified (DateTime?) — necessário para Auth.js
- password (String?) — hash bcrypt
- role (Enum: VIEWER, CONTRIBUTOR, ADMIN, @default(VIEWER))
- squad (String?)
- avatarUrl (String?)
- isActive (Boolean, @default(true))
- lastLoginAt (DateTime?)
- createdAt (DateTime, @default(now()))
- updatedAt (DateTime, @updatedAt)
- Relações: nuggets, collections, accounts, sessions, interestTags

### Account + Session + VerificationToken
- Modelos padrão do Auth.js com Prisma Adapter — gere exatamente como a documentação do Auth.js v5 especifica.

### NuggetType (configurável pelo admin)
- id, name (String, @unique), color (String — hex), icon (String), description (String?), isActive (Boolean, @default(true)), order (Int, @default(0)), createdById (FK → User), createdAt

### Tag (configurável pelo admin)
- id, name (String, @unique), category (String), color (String — hex), description (String?), isActive (Boolean, @default(true)), createdById (FK → User), createdAt
- Relação N:M com Nugget via tabela NuggetTag

### Journey (Jornada — configurável)
- id, name, description (String?), color (String?), stages (Json — array de strings com as etapas), isActive (Boolean, @default(true)), order (Int, @default(0)), createdById (FK → User), createdAt

### ResearchMethod (Método — configurável)
- id, name, category (String — ex: "qualitativo", "quantitativo", "desk"), description (String?), isActive (Boolean, @default(true)), createdById (FK → User)

### Segment (Segmento de usuário — configurável)
- id, name, description (String?), isActive (Boolean, @default(true)), createdById (FK → User)

### Participant (Participante de pesquisa)
- id, code (String — anonimizado, @unique), segmentId (FK → Segment?), persona (String?), usageProfile (String?), timeAsClient (String?), region (String?), notes (String?), createdById (FK → User), createdAt
- Relação N:M com Source via SourceParticipant

### Source (Fonte de pesquisa)
- id, title, description (String?), objective (String?), methodId (FK → ResearchMethod), squad (String?), startDate (DateTime?), endDate (DateTime?), participantCount (Int?), artifactUrl (String?), status (Enum: DRAFT, ACTIVE, ARCHIVED, @default(DRAFT)), createdById (FK → User), createdAt, updatedAt
- Relação N:M com Participant via SourceParticipant

### Nugget (entidade central)
- id, content (String, max 500 chars — valide no app, não no banco), typeId (FK → NuggetType), sourceId (FK → Source), createdById (FK → User), participantId (FK → Participant?), journeyId (FK → Journey?), journeyStage (String?), sentiment (Enum: POSITIVE, NEUTRAL, NEGATIVE?), impact (Enum: LOW, MEDIUM, HIGH, CRITICAL?), status (Enum: NEW, VALIDATED, INVESTIGATING, DISCARDED, ADDRESSED, @default(NEW)), evidenceUrl (String?), notes (String?), completenessScore (Int, @default(0) — calculado no app), createdAt, updatedAt
- Relação N:M com Tag via NuggetTag
- Relação N:M com Nugget (self-relation) via NuggetRelation
- Relação N:M com Collection via CollectionNugget

### NuggetTag (tabela de junção)
- nuggetId + tagId (@@id composto)

### NuggetRelation (self-relation com tipo)
- fromNuggetId, toNuggetId, relationType (Enum: COMPLEMENTS, CONTRADICTS, DEEPENS)
- @@id([fromNuggetId, toNuggetId])

### Collection (Coleção temática)
- id, title, description (String?), context (String?), visibility (Enum: PRIVATE, TEAM, COMPANY, @default(TEAM)), createdById (FK → User), createdAt, updatedAt
- Relação N:M com Nugget via CollectionNugget

### CollectionNugget (tabela de junção com nota)
- collectionId, nuggetId, note (String?), addedById (FK → User), addedAt
- @@id([collectionId, nuggetId])

### SourceParticipant (tabela de junção)
- sourceId + participantId (@@id composto)

---

Regras importantes:
- Use uuid() para todos os IDs
- Todas as FKs de configuração (NuggetType, Tag, Journey, etc.) devem usar onDelete: Restrict para evitar exclusão acidental
- Adicione @@map para nomear as tabelas em snake_case no banco
- Após criar o schema, rode: npx prisma migrate dev --name init
- Após a migration, rode: npx prisma generate
- Crie um arquivo prisma/seed.ts com dados iniciais:
  - 1 usuário Admin (email: admin@nuggets.app, senha: Admin@123)
  - Tipos de nugget padrão: Insight, Problema, Oportunidade, Comportamento, Citação, Dado quantitativo, Sinal, Ponto positivo
  - Métodos padrão: Entrevista em profundidade, Teste de usabilidade, Discovery/Workshop, Survey, NPS/CSAT, Analytics, Experimento A/B, Benchmarking, Insumos SAC, Desk Research
  - 3 tags de exemplo por categoria: Produto, Jornada, Segmento

Ao final, mostre o schema completo gerado e confirme que a migration rodou sem erros.
```

---

## Sessão 2 — Autenticação completa (Épico 1.0)

```
Com o schema Prisma já criado, implemente o sistema de autenticação completo da plataforma Nuggets usando Auth.js v5 com e-mail e senha.

### O que implementar:

**1. Configuração do Auth.js**
- Crie lib/auth.ts com configuração do NextAuth usando PrismaAdapter
- Provider: Credentials (e-mail + senha com bcrypt)
- Estratégia: JWT com refresh token rotation
- Callbacks: jwt e session para incluir role, squad e id do usuário
- Cookies: HttpOnly, Secure, SameSite=Strict para o refresh token

**2. Rotas de autenticação** (em /app/(auth)/)
- /login → formulário de e-mail + senha com validação inline via Zod
  - Mensagem de erro genérica: "E-mail ou senha incorretos" (nunca revele qual está errado)
  - Rate limiting: bloquear IP após 5 tentativas em 10 min (use upstash/ratelimit ou middleware simples com Map em memória para MVP)
  - Checkbox "Lembrar de mim" (30 dias vs sessão)
- /register → formulário de registro: nome, e-mail, senha, confirmação de senha
  - Validação de força de senha: mínimo 10 chars, maiúscula + minúscula + número
  - Strength meter visual abaixo do campo
  - Ao registrar: cria usuário com emailVerified=null, envia e-mail de confirmação
- /verify-email → página que processa o token da URL e marca emailVerified
  - Token: UUID v4, expira em 24h, armazenado hasheado no banco
  - Reenvio disponível após 60s de cooldown, máximo 3x em 24h
- /forgot-password → formulário de e-mail para reset
  - Sempre retorna a mesma mensagem genérica (mesmo se e-mail não existir)
- /reset-password → formulário de nova senha com token na URL
  - Token: UUID v4, expira em 1h, uso único
  - Ao salvar: invalida TODAS as sessões ativas do usuário

**3. Middleware** (middleware.ts na raiz)
- Proteger todas as rotas /app/* — redirecionar para /login se não autenticado
- Redirecionar usuário logado que tenta acessar /login → /app

**4. E-mails transacionais** (usando Resend + React Email)
- Template: confirmação de conta (link de verificação)
- Template: reset de senha (link de reset)
- Template: alerta de novo login (dispositivo + hora)
- Crie /emails/ com os templates em React Email

**5. Gestão de conta** (em /app/account)
- Página de perfil: editar nome, squad, avatar (upload de imagem ou iniciais geradas)
- Alterar senha: requer senha atual + nova senha + confirmação
- Sessões ativas: listar sessões (data, IP mascarado) e permitir encerrar individualmente ou todas

**6. API routes necessárias**
- POST /api/auth/register
- POST /api/auth/verify-email
- POST /api/auth/resend-verification
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/sessions
- DELETE /api/auth/sessions/[id]

### Padrões de UI:
- Use Tailwind para todos os estilos
- Formulários com feedback visual em tempo real (validação inline, não só no submit)
- Loading states em todos os botões de ação
- Telas de auth centralizadas, fundo cinza claro, card branco, logo "Nuggets" no topo

Ao final, teste manualmente: registro → confirmação de e-mail → login → reset de senha → trocar senha logado. Confirme que cada fluxo funciona sem erro no console.
```

---

## Sessão 3 — Gestão de taxonomia (Épico 1.2)

```
Com autenticação funcionando, implemente a área de configuração de taxonomia para o papel Admin.

### O que implementar:

**Rota:** /app/admin/taxonomy (protegida para ADMIN apenas — redirecionar VIEWER e CONTRIBUTOR para /app)

**Interface:** abas laterais ou tabs para cada entidade configurável:
1. Tipos de Nugget (NuggetType)
2. Tags
3. Jornadas (Journey)
4. Métodos de pesquisa (ResearchMethod)
5. Segmentos de usuário (Segment)

**Para cada entidade, implemente:**

LISTAGEM:
- Tabela com nome, cor/ícone (preview visual), status (ativo/inativo), nº de itens vinculados, ações
- Drag-and-drop para reordenar (onde aplicável: NuggetType, Journey)
- Filtro por status (ativos / inativos / todos)

CRIAÇÃO/EDIÇÃO (modal ou painel lateral inline):
- NuggetType: nome, cor (color picker hex), ícone (grid de ícones para escolher — use conjunto fixo de ~20 ícones do Heroicons ou similar), descrição opcional
- Tag: nome, categoria (campo texto livre), cor (color picker), descrição opcional
- Journey: nome, cor, descrição, etapas (campo de lista dinâmica — adicionar/remover/reordenar etapas)
- ResearchMethod: nome, categoria (dropdown: qualitativo / quantitativo / desk research), descrição
- Segment: nome, descrição

DESATIVAÇÃO (nunca exclusão física):
- Botão "Desativar" com modal de confirmação mostrando:
  - Quantos nuggets estão vinculados a este item
  - Texto: "Este item não será excluído. Ele ficará oculto em novos cadastros, mas permanecerá nos registros históricos."
- Itens inativos aparecem com opacidade reduzida e badge "Inativo"
- Botão "Reativar" disponível para itens inativos

**API routes necessárias:**
- GET/POST /api/admin/nugget-types
- PATCH/DELETE /api/admin/nugget-types/[id]
- GET/POST /api/admin/tags
- PATCH/DELETE /api/admin/tags/[id]
- GET/POST /api/admin/journeys
- PATCH/DELETE /api/admin/journeys/[id]
- GET/POST /api/admin/methods
- PATCH/DELETE /api/admin/methods/[id]
- GET/POST /api/admin/segments
- PATCH/DELETE /api/admin/segments/[id]
- PATCH /api/admin/nugget-types/reorder (para drag-and-drop)

**Validações importantes:**
- Nome único por entidade (verificar no banco antes de salvar)
- Cor deve ser hex válido (#RRGGBB)
- Não permitir desativação se for o único tipo/método ativo no sistema
- Mutations são restritas ao papel ADMIN — retornar 403 para outros papéis

**Gestão de usuários** (mesma área /app/admin/users):
- Tabela de usuários: nome, e-mail, papel, status, último acesso
- Convidar usuário: input de e-mail + select de papel → envia e-mail de convite com link (expira em 7 dias)
- Alterar papel de um usuário (dropdown inline na tabela)
- Desativar conta (encerra sessões imediatamente)

Ao final, teste: criar um tipo de nugget → editar → desativar → confirmar que aparece como "Inativo" e some do formulário de criação de nugget.
```

---

## Sessão 4 — Cadastro de Fontes e Participantes (Épicos 1.3 e 1.4)

```
Implemente o cadastro e visualização de Fontes de pesquisa e Participantes.

### Fontes (/app/sources)

LISTAGEM (/app/sources):
- Cards ou tabela com: título, método (badge colorido), squad, período, nº de nuggets, status
- Filtros: método, squad, status, período
- Botão "Nova fonte" (acesso CONTRIBUTOR e ADMIN)

CRIAÇÃO (/app/sources/new):
- Formulário completo:
  - Título (obrigatório)
  - Método (select da lista de ResearchMethods ativos — obrigatório)
  - Squad (texto livre)
  - Descrição e objetivo (textareas opcionais)
  - Período: data início + data fim (date pickers)
  - Nº de participantes (número)
  - Link do artefato (URL — Notion, Drive, Miro etc.)
  - Status (DRAFT por padrão)
- Ao salvar, redirecionar para a página de detalhe da fonte

DETALHE (/app/sources/[id]):
- Header com título, método, squad, período, status
- Seção de participantes vinculados (lista + botão "Adicionar participante")
- Seção de nuggets gerados desta fonte (lista com preview — implementar depois no épico de nuggets)
- Ações: editar, arquivar, duplicar fonte

### Participantes (/app/participants)

CRIAÇÃO (pode ser inline na fonte ou via página própria):
- código anonimizado (obrigatório — gerado automaticamente como P001, P002... mas editável)
- segmento (select dos Segments ativos)
- persona, perfil de uso, tempo como cliente, região (todos opcionais)
- notas internas

DETALHE (/app/participants/[id]):
- Perfil completo
- Histórico: em quais fontes participou + nuggets gerados a partir deste participante

### Vinculação Fonte ↔ Participante:
- Na página de detalhe da Fonte, botão "Adicionar participante"
- Modal com search de participantes existentes + opção "Criar novo participante"
- Participante pode ser vinculado a múltiplas fontes

### API routes:
- GET/POST /api/sources
- GET/PATCH/DELETE /api/sources/[id]
- POST /api/sources/[id]/participants (vincular participante existente)
- GET/POST /api/participants
- GET/PATCH /api/participants/[id]

Ao final, teste o fluxo: criar fonte → adicionar participantes → ver detalhe com participantes listados.
```

---

## Sessão 5 — Criação e visualização de Nuggets (Épico 1.5)

```
Implemente o coração da plataforma: criar, editar e visualizar nuggets.

### Formulário de criação (modal global + página /app/nuggets/new)

O formulário deve ser acessível de duas formas:
1. Botão fixo "+ Nugget" no header/sidebar (abre modal — disponível em qualquer tela)
2. Rota /app/nuggets/new (página completa)

**Campos do formulário — na ordem de exibição:**

OBRIGATÓRIOS (passo 1 — sempre visíveis):
- Conteúdo (textarea, max 500 chars com contador regressivo visível, obrigatório)
- Tipo (select com preview de cor e ícone de cada NuggetType ativo, obrigatório)
- Fonte (select com busca — mostra fontes recentes primeiro, obrigatório)
  - Ao selecionar fonte: se a fonte tiver participantes, exibir campo de participante abaixo
  - Link "Criar nova fonte" → abre modal lateral com formulário enxuto de Fonte

OPCIONAIS (painel expansível "Classificar nugget"):
- Participante (select — aparece apenas se a fonte selecionada tiver participantes cadastrados)
- Jornada (select de Journeys ativas)
- Etapa da jornada (select dinâmico — aparece após selecionar jornada, opções vêm do campo stages da Journey)
- Tags (multi-select com busca e criação inline — digitar e pressionar Enter cria tag nova)
- Sentimento (3 botões toggle: 😞 Negativo / 😐 Neutro / 😊 Positivo)
- Impacto (4 botões: Baixo / Médio / Alto / Crítico)

EVIDÊNCIA (painel expansível "Adicionar evidência"):
- Upload de arquivo (imagem, PDF, vídeo — max 10MB) OU URL externa (Notion, Drive, Loom, Figma)
- Preview da evidência se for imagem
- Notas internas (textarea)

INDICADOR DE COMPLETUDE:
- Barra de progresso no topo do formulário
- Calcular score: tipo(20) + fonte(20) + jornada(15) + tags(15) + sentimento(10) + impacto(10) + evidência(10) = 100
- Labels: 0-40% "Incompleto" / 41-70% "Básico" / 71-100% "Completo"

AÇÕES:
- "Salvar" — salva e vai para página de detalhe
- "Salvar e criar próximo" — salva e reabre o formulário (mantendo fonte selecionada)
- Rascunho automático: salvar no localStorage a cada 30s, restaurar ao reabrir

### Página de detalhe do nugget (/app/nuggets/[id])

Layout dividido em duas colunas:
- ESQUERDA (2/3): conteúdo, evidência, nuggets relacionados, comentários (fase 2)
- DIREITA (1/3): metadados completos (tipo, fonte, participante, jornada, tags, sentimento, impacto, status, criado por, data)

No detalhe:
- Editar nugget inline (transformar campos em editáveis ao clicar em "Editar")
- Mudar status via dropdown (NEW → VALIDATED → INVESTIGATING → DISCARDED → ADDRESSED)
- Seção "Nuggets relacionados": busca e vinculação com tipo de relação (Complementa / Contradiz / Aprofunda)
- Breadcrumb: Repositório → [tipo] → nugget

### Listagem base (/app/nuggets — será expandida no épico de busca)
- Grid de cards com: conteúdo (truncado), tipo (badge), fonte, tags, data
- Por enquanto: sem filtros (será o próximo épico)

### API routes:
- GET/POST /api/nuggets
- GET/PATCH/DELETE /api/nuggets/[id]
- POST /api/nuggets/[id]/relations
- DELETE /api/nuggets/[id]/relations/[relationId]
- POST /api/nuggets/draft (salvar rascunho)

### Regras de negócio:
- Ao salvar nugget, calcular completenessScore e persistir no banco
- Soft delete: campo deletedAt, nunca excluir do banco
- Apenas o criador ou ADMIN pode editar/excluir

Ao final, teste: criar nugget completo → ver detalhe → editar campos → vincular nugget relacionado.
```

---

## Sessão 6 — Busca e filtros (Épico 1.6)

```
Implemente o sistema de busca e filtros do repositório de nuggets.

### Página principal do repositório (/app)

BARRA DE BUSCA GLOBAL:
- Sempre visível no header (atalho: Cmd+K / Ctrl+K)
- Busca full-text no campo content dos nuggets usando PostgreSQL full-text search (tsvector/tsquery)
- Criar index de busca no Prisma: @@index com raw SQL migration para tsvector
- Resultados em tempo real com debounce de 300ms
- Highlight do termo buscado nos resultados

FILTROS (painel lateral ou barra horizontal — escolha o que ficar mais limpo no layout):
- Tipo: multi-select com preview de cor/ícone (checkboxes visuais)
- Jornada + Etapa: select cascata
- Segmento: multi-select
- Tags: multi-select com busca
- Período: date range picker (data de criação do nugget)
- Squad: texto livre com autocomplete
- Sentimento: toggle (Positivo / Neutro / Negativo)
- Status: multi-select (NEW, VALIDATED, INVESTIGATING, DISCARDED, ADDRESSED)
- Criado por: select de usuários

COMPORTAMENTOS:
- Filtros combinados com AND entre categorias diferentes, OR dentro da mesma categoria
- Contador de resultados sempre visível ("47 nuggets encontrados")
- Botão "Limpar filtros" aparece quando há filtro ativo
- Filtros persistem na URL como query params (ex: ?type=insight&tag=onboarding) — permite compartilhar a busca
- Filtros persistem na sessão do usuário (salvar no estado)

VISUALIZAÇÕES:
- Toggle entre lista e kanban
- LISTA: cards com conteúdo (3 linhas + "ver mais"), tipo, fonte, tags, sentimento, data, criado por
- KANBAN: colunas por Tipo de Nugget, cards compactos, scroll horizontal

CASO DE RESULTADO VAZIO:
- Ilustração + mensagem: "Nenhum nugget encontrado com esses filtros"
- Sugestão: "Tente remover alguns filtros" + botão "Limpar tudo"

### API routes:
- GET /api/nuggets (com query params: q, type, journey, stage, segment, tags, period, squad, sentiment, status, createdBy, page, limit, sortBy)
- Paginação: cursor-based (mais eficiente que offset para listas longas)
- Ordenação: mais recentes, mais antigos, maior completude, mais relacionados

### Otimizações:
- Index composto no banco para os filtros mais usados (type + status + createdAt)
- Cache de resultados de busca com revalidação a cada 60s (Next.js cache)

Ao final, teste: buscar termo → aplicar 3 filtros → compartilhar URL → abrir em aba nova → filtros devem estar preservados.
```

---

## Sessão 7 — Layout e navegação global

> Pode ser feita em paralelo com qualquer sessão após a Sessão 2.

```
Implemente o layout global da aplicação — sidebar, header, navegação e estrutura de páginas.

### Layout principal (/app/(app)/layout.tsx)

SIDEBAR (fixa à esquerda, 240px, colapsável para 64px):
- Logo "Nuggets" no topo
- Navegação principal:
  - 🏠 Repositório (/app) — página principal de nuggets
  - 🔍 Fontes (/app/sources)
  - 👤 Participantes (/app/participants)
  - 📚 Coleções (/app/collections) — fase 2, deixar inativo por enquanto
  - ⚙️ Admin (/app/admin) — visível apenas para ADMIN
- Rodapé da sidebar: avatar do usuário logado + nome + squad + link para perfil + botão logout

HEADER (fixo no topo, altura 56px):
- Barra de busca global (abre modal de resultados — Cmd+K)
- Botão "+ Nugget" (abre modal de criação — sempre visível para CONTRIBUTOR e ADMIN)
- Notificações (sino — fase 2, deixar como placeholder)

PÁGINA INICIAL (/app):
- Título "Repositório"
- Estatísticas rápidas no topo: total de nuggets, adicionados esta semana, fontes ativas (3 cards pequenos)
- Feed de nuggets recentes (últimos 20) com busca e filtros
- Seção "Atividade recente": últimos nuggets adicionados pelo time (sidebar direita)

ESTADOS GLOBAIS:
- Toast de sucesso/erro após ações (criar, editar, excluir)
- Loading skeleton nas listagens enquanto carrega
- Empty state com ilustração quando não há conteúdo

RESPONSIVIDADE:
- Sidebar colapsa automaticamente em telas < 1024px
- Menu mobile: bottom navigation com ícones

USE componentes reutilizáveis para:
- NuggetCard (card de nugget nas listagens)
- TypeBadge (badge de tipo com cor configurável)
- TagPill (pill de tag)
- SentimentIcon (ícone de sentimento)
- EmptyState (tela vazia com ícone e mensagem)
- LoadingSkeleton (placeholder de carregamento)

Ao final, navegue por todas as rotas e confirme que o layout está consistente e sem erros de hidratação no console.
```

---

## Sessão 8 — Coleções e exportação (Épico 2.1 e 2.4)

```
Implemente coleções temáticas e exportação de nuggets.

### Coleções (/app/collections)

LISTAGEM:
- Cards de coleções: título, descrição, nº de nuggets, visibilidade (badge), criado por, data
- Minhas coleções vs. coleções da empresa (tabs)
- Botão "Nova coleção"

CRIAÇÃO:
- Modal: título (obrigatório), descrição, contexto de uso, visibilidade (PRIVATE / TEAM / COMPANY)

DETALHE (/app/collections/[id]):
- Header: título, descrição, visibilidade, criado por
- Lista de nuggets da coleção (com notas contextuais por item)
- Botão "Adicionar nuggets" → abre modal de busca e seleção de nuggets
- Reordenar nuggets dentro da coleção (drag-and-drop)
- Link compartilhável: /share/collections/[id] (leitura pública sem login)

ADICIONAR À COLEÇÃO a partir do repositório:
- Checkbox de seleção múltipla nos cards de nugget
- Barra flutuante no rodapé quando há seleção: "X nuggets selecionados → Adicionar à coleção"
- Selecionar coleção existente ou criar nova inline

### Exportação

EXPORTAR SELEÇÃO OU COLEÇÃO:
- Botão "Exportar" na página de coleção e na seleção múltipla
- Opções:
  - PDF: gere um PDF formatado com título, data, lista de nuggets com metadados
    - Use a biblioteca @react-pdf/renderer ou puppeteer
    - Layout: capa com título da coleção, data, criado por; depois um nugget por bloco com tipo, conteúdo, fonte, tags, jornada
  - Markdown: texto puro para colar no Notion/Confluence
    - Formato: ## [Tipo] seguido do conteúdo, depois metadados em itálico
  - CSV: dados brutos para análise
    - Colunas: id, conteúdo, tipo, fonte, jornada, etapa, tags, sentimento, impacto, status, criado_por, data

### API routes:
- GET/POST /api/collections
- GET/PATCH/DELETE /api/collections/[id]
- POST /api/collections/[id]/nuggets (adicionar nuggets)
- DELETE /api/collections/[id]/nuggets/[nuggetId]
- PATCH /api/collections/[id]/nuggets/reorder
- GET /api/collections/[id]/export?format=pdf|markdown|csv
- GET /share/collections/[id] (rota pública, sem auth)

Ao final, teste: criar coleção → adicionar nuggets → reordenar → exportar PDF → abrir link público.
```

---

## Sessão 9 — Importação em lote (Épico 2.3)

```
Implemente importação de nuggets via CSV/XLSX para migração de acervos existentes.

### Rota: /app/import

PASSO 1 — Upload do arquivo:
- Drag-and-drop ou click to upload (.csv ou .xlsx)
- Validação do formato antes de processar
- Limite: 1000 linhas por importação

PASSO 2 — Mapeamento de colunas:
- Exibir as primeiras 3 linhas do arquivo como preview
- Para cada coluna do arquivo, um select para mapear para um campo do Nugget:
  - conteúdo (obrigatório)
  - tipo (texto — vai tentar fazer match com NuggetTypes existentes)
  - fonte (texto — título da fonte; se não existir, cria nova)
  - jornada, etapa, tags (separadas por vírgula), sentimento, impacto, notas
- Mostrar preview do resultado após mapeamento (primeiras 5 linhas transformadas)

PASSO 3 — Validação:
- Processar todas as linhas e exibir relatório:
  - ✅ X linhas válidas prontas para importar
  - ⚠️ Y linhas com avisos (ex: tipo não reconhecido → vai usar tipo padrão)
  - ❌ Z linhas com erros (ex: conteúdo vazio) — mostrar número da linha e motivo
- Opção "Importar apenas as válidas" mesmo com erros

PASSO 4 — Importação:
- Barra de progresso durante importação (processar em batches de 50)
- Ao concluir: "X nuggets importados com sucesso. Y falharam." com link para ver os erros
- Nuggets importados recebem source automática "Importação [data]" se não houver fonte mapeada

### Template para download:
- Botão "Baixar template CSV" com as colunas esperadas e 2 linhas de exemplo

### API route:
- POST /api/import (multipart/form-data)
- GET /api/import/[jobId] (status do job de importação)

Ao final, crie um CSV de teste com 20 linhas (mistura de válidas, com aviso e com erro) e valide todo o fluxo.
```

---

## Sessão 10 — Notificações e preferências (Épico 2.5)

```
Implemente o sistema de notificações e preferências do usuário.

### Preferências de notificação (/app/account/notifications)

O usuário define quais eventos quer receber:
- ✅ Novos nuggets com tags do meu interesse
- ✅ Novos nuggets na(s) jornada(s) que acompanho
- ✅ Comentários em nuggets que criei
- ✅ Menções (@) em comentários
- ✅ Digest semanal por e-mail (toda segunda, resumo da semana)

Tags e jornadas de interesse: multi-select (usuário escolhe quais monitorar)

### Notificações in-app

CENTRO DE NOTIFICAÇÕES (sino no header):
- Dropdown com últimas 20 notificações
- Badge com contagem de não lidas (some ao abrir)
- Cada notificação: ícone do tipo, texto descritivo, link para o conteúdo, tempo relativo ("há 2h")
- Botão "Marcar todas como lidas"
- Link "Ver todas" → /app/notifications (lista completa com paginação)

### Modelo de dados para notificações:
Adicione ao schema Prisma:
- Notification: id, userId (FK), type (Enum), title, body, link, isRead (Boolean, default false), createdAt
- UserNotificationPreference: userId, eventType, isEnabled, createdAt

### Notificações por e-mail (Resend):
- Digest semanal: job que roda toda segunda às 8h (use Vercel Cron ou node-cron)
  - Conteúdo: nuggets adicionados na semana filtrados pelas preferências do usuário
  - Se 0 nuggets relevantes → não enviar

### API routes:
- GET /api/notifications (com filtro isRead)
- PATCH /api/notifications/[id]/read
- PATCH /api/notifications/read-all
- GET/PATCH /api/account/notification-preferences

### Trigger de notificações:
Ao criar um nugget, no server action ou API route, verificar todos os usuários com interesse nas tags ou jornada do nugget e criar registros na tabela Notification para cada um.

Ao final, teste: criar nugget com uma tag → confirmar que usuário com interesse nessa tag recebeu notificação in-app.
```

---

## Prompt de revisão geral (use ao final de cada fase)

```
Faça uma revisão geral do que foi construído até agora na plataforma Nuggets:

1. SEGURANÇA: verifique se há alguma rota que aceita mutation (POST/PATCH/DELETE) sem verificar o papel do usuário. Liste as que encontrar.

2. CONSISTÊNCIA: verifique se o schema Prisma e as API routes estão alinhados — todos os campos do schema têm endpoints correspondentes?

3. TRATAMENTO DE ERROS: verifique se todas as API routes retornam erros adequados (400, 401, 403, 404, 500) com mensagens em português.

4. TYPESCRIPT: rode `npx tsc --noEmit` e corrija todos os erros de tipo encontrados.

5. BANCO DE DADOS: rode `npx prisma validate` para confirmar que o schema está válido.

6. BUILD: rode `npm run build` e corrija qualquer erro de build antes de fazer deploy.

Liste todos os problemas encontrados em cada categoria e corrija um por um.
```

---

## Dicas gerais para trabalhar com Claude Code

**Antes de cada sessão:**
- Cole o "Prompt de contexto" do início deste arquivo
- Descreva o que já existe no campo entre colchetes
- Mostre eventuais erros do build anterior, se houver

**Durante a sessão:**
- Se Claude Code gerar um arquivo muito longo, peça para dividir em partes: *"Agora gere apenas o arquivo [X], o resto depois"*
- Se aparecer erro no console do browser, cole o erro completo: *"Estou vendo esse erro: [erro]. O que causou e como corrigir?"*
- Se uma função não funcionar como esperado: *"A função [X] deveria fazer [Y] mas está fazendo [Z]. Mostre o código atual e corrija"*

**Manutenção:**
- Antes de qualquer mudança grande, pergunte: *"Se eu fizer [mudança], o que pode quebrar no resto do projeto?"*
- Para adicionar uma feature pequena: *"Quero adicionar [feature] na página [X]. Quais arquivos vou precisar criar ou modificar?"*
