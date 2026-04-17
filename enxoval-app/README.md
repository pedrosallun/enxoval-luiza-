# 👶💕 Enxoval da Luiza

Sistema de controle de compras do enxoval com sincronização em nuvem. Os dados ficam salvos no banco de dados — você pode acessar de qualquer dispositivo (celular, computador) e nunca perde nada.

## 🏗️ Arquitetura

- **Frontend**: HTML/CSS/JS puro (sem framework, carrega em milissegundos)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Banco de dados**: Supabase (PostgreSQL)
- **Hosting**: Vercel (grátis pra uso pessoal)

## 📋 Estrutura do projeto

```
enxoval-luiza/
├── api/                    # Backend serverless (Vercel Functions)
│   ├── data.js            # GET todos os dados
│   ├── items.js           # POST/PATCH/DELETE items
│   ├── preferences.js     # PATCH preferências
│   └── reset.js           # POST reset completo
├── public/                 # Frontend estático
│   ├── index.html         # Interface principal
│   ├── app.js             # Lógica do cliente
│   └── manifest.json      # PWA manifest
├── sql/
│   └── schema.sql         # Schema do banco + seed de 112 itens
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

## 🚀 Passo a passo do deploy

### 1️⃣ Criar o banco de dados no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login (você já tem conta pro PRØ Academy).
2. Clique em **New Project**:
   - Nome: `enxoval-luiza`
   - Database Password: crie uma senha forte (salve em algum lugar)
   - Region: **South America (São Paulo)**
3. Aguarde ~2 minutos até o projeto estar pronto.
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `sql/schema.sql` deste repositório, copie TODO o conteúdo e cole no editor.
6. Clique em **Run** (ou Ctrl+Enter). Vai aparecer "Success. No rows returned".
7. Confirme que deu certo: vá em **Table Editor** no menu lateral — você deve ver 3 tabelas (`sizes`, `items`, `preferences`).

### 2️⃣ Pegar as credenciais do Supabase

1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie e guarde esses dois valores (vai precisar no passo 4):
   - **Project URL** (algo tipo `https://xxxxxxxx.supabase.co`)
   - **service_role** secret (clique em "Reveal" — é uma string longa começando com `eyJ...`)

> ⚠️ **IMPORTANTE**: Use a **service_role key**, NÃO a anon key. A service role tem permissão de escrita no banco.

### 3️⃣ Subir o código para o GitHub

Abra o terminal e rode:

```bash
# Dentro da pasta do projeto
git init
git add .
git commit -m "Initial commit: sistema enxoval Luiza"
git branch -M main
git remote add origin https://github.com/pedrosallun/enxoval-luiza-.git
git push -u origin main
```

Se pedir autenticação, use seu token de acesso do GitHub (não a senha).

### 4️⃣ Deploy no Vercel

1. Acesse [https://vercel.com](https://vercel.com) e faça login com sua conta do GitHub.
2. Clique em **Add New → Project**.
3. Importe o repositório **enxoval-luiza-**.
4. Na tela de configuração:
   - **Framework Preset**: Other (vai detectar automático)
   - **Root Directory**: `./` (deixe padrão)
   - **Build Command**: deixe vazio
   - **Output Directory**: deixe vazio
5. Em **Environment Variables**, adicione as duas variáveis do Supabase:
   - `SUPABASE_URL` = o Project URL que você copiou
   - `SUPABASE_SERVICE_KEY` = a service_role key que você copiou
6. Clique em **Deploy**.
7. Aguarde ~30 segundos. Quando terminar, o Vercel te dá uma URL (algo tipo `enxoval-luiza.vercel.app`).

### 5️⃣ Testar

Abra a URL do Vercel no celular e no computador. Marque um item em um dispositivo e abra no outro — deve aparecer atualizado! 💕

### 6️⃣ Instalar como app no celular (opcional mas recomendado)

**iPhone:**
1. Abra a URL no Safari
2. Toque no botão de compartilhar (quadrado com seta pra cima)
3. **Adicionar à Tela de Início**
4. Pronto — tem um ícone na sua home

**Android:**
1. Abra a URL no Chrome
2. Menu (3 pontinhos) → **Adicionar à tela inicial**

## 🔧 Desenvolvimento local (opcional)

Se quiser rodar localmente pra testar mudanças antes de deployar:

```bash
# Instalar dependências
npm install

# Instalar Vercel CLI (uma vez só)
npm install -g vercel

# Criar arquivo .env com suas credenciais
cp .env.example .env
# (edite o .env e preencha)

# Rodar localmente
vercel dev
```

Acesse `http://localhost:3000`.

## 💾 Backup do banco

O Supabase já faz backup automático do plano gratuito (retenção de 7 dias). Pra backup manual, use o botão **Exportar CSV** dentro do app.

Pra backup completo do banco:
1. Supabase → Database → Backups
2. Ou no SQL Editor: `SELECT * FROM items;` e exporte o resultado

## 🎨 Funcionalidades

- ✅ 112 itens do enxoval pré-cadastrados, organizados por tamanho (NB, 3M, 6M, 9M, 12M)
- ✅ Checkbox pra marcar compras prontas
- ✅ Contador de peças compradas vs meta
- ✅ Barra de progresso geral + por tamanho
- ✅ Filtros: todos / faltando / em andamento / completos
- ✅ Adicionar itens personalizados em qualquer tamanho
- ✅ Remover itens
- ✅ Sincronização em tempo real entre dispositivos
- ✅ Exportação CSV pra Excel/Sheets
- ✅ Reset completo
- ✅ Otimizado pra mobile (PWA — instala como app)

## 💡 Feito com carinho para a Luiza 💕

---

**Dúvidas sobre deploy?** Chama o Pedro Sallun ou a Julia.
