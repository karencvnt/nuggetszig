# Nuggets

Repositório centralizado de insights, oportunidades e problemas identificados em pesquisas de produto.

## Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Banco de dados:** PostgreSQL via Supabase + Prisma ORM
- **Autenticação:** Auth.js v5 (e-mail e senha)
- **Estilo:** Tailwind CSS v4
- **E-mails:** Resend + React Email
- **Deploy:** Vercel

## Setup local

### 1. Clone o repositório

```bash
git clone https://github.com/karencvnt/nuggetszig.git
cd nuggetszig
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com os seus valores:

```bash
cp .env.local.example .env.local
```

Variáveis necessárias:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão com o PostgreSQL (Supabase) |
| `DIRECT_URL` | URL direta para migrations (Supabase) |
| `AUTH_SECRET` | Segredo para JWT — gere com `openssl rand -base64 32` |
| `AUTH_URL` | URL da aplicação (ex: `http://localhost:3000`) |
| `RESEND_API_KEY` | Chave da API do Resend para e-mails |
| `RESEND_FROM_EMAIL` | E-mail remetente (ex: `Nuggets <noreply@seudominio.com>`) |

### 4. Configure o banco de dados

```bash
# Rodar as migrations
npx prisma migrate dev

# Gerar o cliente Prisma
npx prisma generate

# Popular o banco com dados iniciais
npx prisma db seed
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

**Usuário admin padrão (após seed):**
- E-mail: `admin@nuggets.app`
- Senha: `Admin@123`

## Estrutura de pastas

```
/app
  /(auth)        → Rotas públicas: login, registro, reset de senha
  /(app)         → Rotas protegidas da aplicação
  /api           → Endpoints de API
/components
  /ui            → Componentes base reutilizáveis
/lib             → Prisma client, Auth.js config, utilitários
/prisma          → schema.prisma e migrations
/emails          → Templates de e-mail (React Email)
/types           → Declarações de tipos TypeScript
```

## Papéis de usuário

| Papel | Permissões |
|---|---|
| **Viewer** | Visualizar nuggets, fontes, coleções públicas |
| **Contributor** | Viewer + criar e editar nuggets, fontes, participantes |
| **Admin** | Contributor + gerenciar taxonomia, usuários e configurações |

## Scripts

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run lint         # ESLint
npx tsc --noEmit     # Verificação de tipos
npx prisma studio    # Interface visual do banco
```
