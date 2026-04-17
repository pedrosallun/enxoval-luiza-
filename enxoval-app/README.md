# 👶 Enxoval · Controle de Compras (v2)

Sistema multi-usuário para controlar compras de enxoval de bebê. Cada conta cria automaticamente a lista de ~110 itens, adaptada ao gênero escolhido (menino 💙, menina 💕 ou surpresa 🌿), e sincroniza na nuvem entre dispositivos.

Originalmente criado para a **Luiza** — generalizado na v2 para qualquer bebê, com versão masculina, feminina e neutra.

## 🏗️ Arquitetura

- **Frontend**: HTML/CSS/JS puro, sem framework (carrega em milissegundos)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Banco de dados**: Supabase (PostgreSQL)
- **Hosting**: Vercel (grátis pra uso pessoal)

## ✨ O que mudou na v2

- 🆕 **Sistema de contas** — cada bebê tem sua própria lista
- 🆕 **Onboarding em 2 steps** — nome do bebê + escolha de gênero
- 🆕 **Lista automática** — ao criar a conta, gera ~110 itens baseados no gênero
- 🆕 **3 temas visuais** — rosa/feminino, azul/masculino, verde/neutro
- 🆕 **Itens por categoria** — agrupados dentro de cada tamanho (Body, Macacão, etc.)
- 🆕 **Menu lateral** — com export CSV, reset, logout e troca de tema
- 🆕 **Código de acesso** — login em outro aparelho via código `u_xxxxxxxxx`
- 🆕 **Multi-tenancy** — toda API aceita `x-user-id` e isola os dados

## 📋 Estrutura do projeto

```
enxoval-app/
├── api/                        # Backend serverless
│   ├── account.js              # 🆕 criar/buscar/atualizar/deletar conta
│   ├── data.js                 # GET dados do usuário (filtrado por x-user-id)
│   ├── items.js                # POST/PATCH/DELETE itens do usuário
│   ├── preferences.js          # PATCH preferências do usuário
│   └── reset.js                # POST reset do progresso do usuário
├── public/
│   ├── index.html              # UI + onboarding + menu (temas por gênero)
│   ├── app.js                  # Lógica cliente (auth + optimistic updates)
│   └── manifest.json           # PWA
├── sql/
│   ├── schema.sql              # v1 (original, linha única)
│   └── schema_v2.sql           # 🆕 v2 com users + templates + multi-tenancy
├── package.json
├── vercel.json
└── README.md
```

## 🧭 Versões masculina vs feminina

| Categoria | Feminino 💕 | Masculino 💙 | Neutro 🌿 |
|---|---|---|---|
| Parte de cima | Blusinha, camiseta, bata | Camiseta, polo, camisa social | Camiseta |
| Parte de baixo | Shorts, saia, jardineira | Bermuda, jogger, jardineira | Calça / shorts |
| Vestidos | 3+ por tamanho | — | — |
| Acessórios | Meia-calça, lacinhos | Suspensório, gravata borboleta | Neutros |
| Conjunto especial | — | Conjunto esportivo | — |
| **Itens neutros comuns** | bodies, macacões, pijamas, meias, sapatinhos, casaco, jaqueta, gorrinho, chapéu — **para todos** | | |

## 🚀 Passo a passo do deploy

### 1️⃣ Criar o banco no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login.
2. **New Project** → escolha região **South America (São Paulo)**.
3. Quando estiver pronto, vá em **SQL Editor** → **New query**.
4. Copie TODO o conteúdo de `sql/schema_v2.sql` e cole no editor.
5. Clique em **Run**. Deve aparecer "Success".
6. Confira em **Table Editor** que existem as tabelas: `users`, `sizes`, `items`, `preferences`, `item_templates`.

> ⚠️ Se você já tem um banco v1 rodando, o `schema_v2.sql` é idempotente e adiciona as colunas/tabelas novas sem quebrar nada. Os itens antigos ficam órfãos (sem `user_id`) — dá pra deletar depois.

### 2️⃣ Pegar credenciais do Supabase

1. **Project Settings → API**.
2. Copie:
   - **Project URL** (`https://xxxxxxxx.supabase.co`)
   - **service_role** secret (clique em "Reveal" — começa com `eyJ...`)

> ⚠️ Use a **service_role key**, não a anon key.

### 3️⃣ Deploy no Vercel

1. Faça push desse repo no GitHub (se ainda não fez).
2. Acesse [https://vercel.com](https://vercel.com) → **Add New → Project**.
3. Importe o repositório.
4. Em **Environment Variables**:
   - `SUPABASE_URL` = o Project URL
   - `SUPABASE_SERVICE_KEY` = a service_role key
5. Clique em **Deploy**.

### 4️⃣ Usar

1. Abra a URL do Vercel.
2. Primeira vez: preencha o nome do bebê + gênero → lista criada automaticamente.
3. Guarde o **código de acesso** (`u_xxxxxxxxx`) que aparece ao fim do onboarding — use ele pra abrir a conta em outro dispositivo.
4. No celular: **Adicionar à tela inicial** (iOS Safari ou Chrome Android) pra instalar como app.

## 🔧 Desenvolvimento local

```bash
npm install
npm install -g vercel
cp .env.example .env   # preencha SUPABASE_URL e SUPABASE_SERVICE_KEY
vercel dev             # http://localhost:3000
```

## 🔑 Como funciona o multi-tenancy

- Cada conta recebe um `id` tipo `u_k3p2xy9ab` (gerado no backend, não é criptográfico).
- O frontend guarda esse id em `localStorage` e envia em todas as requisições como `x-user-id`.
- Todas as queries do backend filtram por `user_id`, então não há cross-talk entre contas.
- Quem tiver o código de acesso tem acesso total à conta — pense nele como um link não-adivinhável.

Se quiser tornar mais seguro no futuro: adicionar email+senha usando Supabase Auth, ou assinar o user_id com JWT.

## 🎨 Funcionalidades

- ✅ **Onboarding** em 2 steps (nome + gênero)
- ✅ **Lista automática** de ~110 itens por conta, baseada em template
- ✅ **3 temas visuais** com tipografia elegante (Inter + Fraunces)
- ✅ **Categorização** de itens dentro de cada tamanho
- ✅ Checkbox pra marcar compras
- ✅ Contador de peças + barra de progresso (geral e por tamanho)
- ✅ Filtros: todos / faltando / em andamento / completos
- ✅ Adicionar itens personalizados
- ✅ Remover itens
- ✅ Sincronização em tempo real entre dispositivos
- ✅ Exportação CSV (com categoria)
- ✅ Reset completo (zera progresso, preserva conta)
- ✅ Menu lateral com troca de tema
- ✅ Otimizado pra mobile (PWA)

## 💡 Feito com carinho 💕

---

**Dúvidas sobre deploy?** Chama o Pedro Sallun.
