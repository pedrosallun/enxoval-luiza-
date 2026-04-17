-- ============================================================
-- ENXOVAL MULTI-USUÁRIO - Schema V2
-- ============================================================
-- V2 adiciona:
--   - Tabela users (com nome do bebê + gênero: boy / girl / neutral)
--   - user_id em items e preferences (multi-tenancy)
--   - Tabela item_templates (modelo base que gera a lista de cada conta)
--
-- Execute este SQL no Supabase SQL Editor. É IDEMPOTENTE —
-- pode rodar por cima de um banco existente (v1) com segurança.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabela de usuários (cada "enxoval" = 1 user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  baby_name TEXT NOT NULL,
  parent_name TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('boy','girl')),
  theme TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2) Tabela sizes (comum — não depende de usuário)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tam TEXT NOT NULL,
  season TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3) Itens do enxoval agora pertencem a um usuário
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_id TEXT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
  target INT NOT NULL DEFAULT 1,
  bought INT NOT NULL DEFAULT 0,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se estiver migrando da V1, adiciona a coluna user_id e campos novos
ALTER TABLE items ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_size_id ON items(size_id);
CREATE INDEX IF NOT EXISTS idx_items_user_size ON items(user_id, size_id);

-- ------------------------------------------------------------
-- 4) Preferências por usuário
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  filter TEXT DEFAULT 'all',
  collapsed JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migração V1 → V2: adiciona coluna user_id na tabela preferences antiga
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ------------------------------------------------------------
-- 5) Templates de itens (gera a lista inicial de cada conta)
-- gender pode ser 'boy', 'girl' ou 'neutral' (aparece pra todos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS item_templates (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  size_id TEXT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
  target INT NOT NULL DEFAULT 1,
  note TEXT,
  category TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('boy','girl','neutral')),
  sort_order INT DEFAULT 0,
  UNIQUE(code, size_id, gender)
);

CREATE INDEX IF NOT EXISTS idx_templates_gender ON item_templates(gender);

-- ------------------------------------------------------------
-- 6) Trigger de updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON preferences;
CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 7) SEED: Tamanhos
-- ------------------------------------------------------------
INSERT INTO sizes (id, name, tam, season, display_order) VALUES
  ('nb',  'RN – 1 mês',    'NB',       'Primavera',          1),
  ('3m',  '1 a 3 meses',   '3M (P)',   'Primavera/Verão',    2),
  ('6m',  '3 a 6 meses',   '6M (M)',   'Verão/Outono',       3),
  ('9m',  '6 a 9 meses',   '9M (G)',   'Outono/Inverno',     4),
  ('12m', '9 a 12 meses',  '12M (GG)', 'Inverno/Primavera',  5)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 8) SEED: Templates — itens NEUTROS (aparecem em qualquer gênero)
-- ------------------------------------------------------------
-- Limpa antes pra garantir idempotência do seed
TRUNCATE TABLE item_templates RESTART IDENTITY;

INSERT INTO item_templates (code, name, size_id, target, note, category, gender, sort_order) VALUES
  -- Macacão comprido
  ('macacao_comp','Macacão comprido (com pé ou sem pé)','nb', 6,NULL,'Macacão','neutral',10),
  ('macacao_comp','Macacão comprido (com pé ou sem pé)','3m', 7,NULL,'Macacão','neutral',10),
  ('macacao_comp','Macacão comprido (com pé ou sem pé)','6m', 7,NULL,'Macacão','neutral',10),
  ('macacao_comp','Macacão comprido (com pé ou sem pé)','9m', 7,NULL,'Macacão','neutral',10),
  ('macacao_comp','Macacão comprido (com pé ou sem pé)','12m',4,NULL,'Macacão','neutral',10),
  -- Saco de dormir / Pijama
  ('pijama','Saco de dormir e Conjunto Pijama','nb', 3,'3 swaddles 0-3m','Dormir','neutral',20),
  ('pijama','Saco de dormir e Conjunto Pijama','3m', 2,'2 sacos de dormir 0-3m','Dormir','neutral',20),
  ('pijama','Saco de dormir e Conjunto Pijama','6m', 2,'2 sacos de dormir 3-6m','Dormir','neutral',20),
  ('pijama','Saco de dormir e Conjunto Pijama','9m', 2,'2 sacos de dormir 6-12m','Dormir','neutral',20),
  ('pijama','Saco de dormir e Conjunto Pijama','12m',4,'4 conjuntos','Dormir','neutral',20),
  -- Body branco manga longa
  ('body_br_ml','Body branco manga longa','nb', 4,NULL,'Body','neutral',30),
  ('body_br_ml','Body branco manga longa','3m', 4,NULL,'Body','neutral',30),
  ('body_br_ml','Body branco manga longa','6m', 4,NULL,'Body','neutral',30),
  ('body_br_ml','Body branco manga longa','9m', 4,NULL,'Body','neutral',30),
  ('body_br_ml','Body branco manga longa','12m',4,NULL,'Body','neutral',30),
  -- Body branco manga curta
  ('body_br_mc','Body branco manga curta','nb', 5,NULL,'Body','neutral',31),
  ('body_br_mc','Body branco manga curta','3m', 5,NULL,'Body','neutral',31),
  ('body_br_mc','Body branco manga curta','6m', 5,NULL,'Body','neutral',31),
  ('body_br_mc','Body branco manga curta','9m', 5,NULL,'Body','neutral',31),
  ('body_br_mc','Body branco manga curta','12m',5,NULL,'Body','neutral',31),
  -- Body colorido manga longa
  ('body_col_ml','Body colorido manga longa','nb', 4,NULL,'Body','neutral',32),
  ('body_col_ml','Body colorido manga longa','3m', 4,NULL,'Body','neutral',32),
  ('body_col_ml','Body colorido manga longa','6m', 4,NULL,'Body','neutral',32),
  ('body_col_ml','Body colorido manga longa','9m', 4,NULL,'Body','neutral',32),
  ('body_col_ml','Body colorido manga longa','12m',4,NULL,'Body','neutral',32),
  -- Body colorido manga curta
  ('body_col_mc','Body colorido manga curta','nb', 5,NULL,'Body','neutral',33),
  ('body_col_mc','Body colorido manga curta','3m', 5,NULL,'Body','neutral',33),
  ('body_col_mc','Body colorido manga curta','6m', 5,NULL,'Body','neutral',33),
  ('body_col_mc','Body colorido manga curta','9m', 5,NULL,'Body','neutral',33),
  ('body_col_mc','Body colorido manga curta','12m',5,NULL,'Body','neutral',33),
  -- Calças de malha
  ('calca_malha','Calças de malha combinando com bodies','nb', 6,NULL,'Parte de baixo','neutral',40),
  ('calca_malha','Calças de malha combinando com bodies','3m', 6,NULL,'Parte de baixo','neutral',40),
  ('calca_malha','Calças de malha combinando com bodies','6m', 6,NULL,'Parte de baixo','neutral',40),
  ('calca_malha','Calças de malha combinando com bodies','9m', 6,NULL,'Parte de baixo','neutral',40),
  ('calca_malha','Calças de malha combinando com bodies','12m',6,NULL,'Parte de baixo','neutral',40),
  -- Conjunto 3 peças
  ('conj_3pc','Conjunto de 3 peças (calça e 2 bodies)','nb', 2,NULL,'Conjunto','neutral',50),
  ('conj_3pc','Conjunto de 3 peças (calça e 2 bodies)','3m', 2,NULL,'Conjunto','neutral',50),
  ('conj_3pc','Conjunto de 3 peças (calça e 2 bodies)','6m', 2,NULL,'Conjunto','neutral',50),
  ('conj_3pc','Conjunto de 3 peças (calça e 2 bodies)','9m', 2,NULL,'Conjunto','neutral',50),
  ('conj_3pc','Conjunto de 3 peças (calça e 2 bodies)','12m',2,NULL,'Conjunto','neutral',50),
  -- Macacão curto / romper
  ('romper','Macacão curto/verão (rompers)','nb', 1,NULL,'Macacão','neutral',60),
  ('romper','Macacão curto/verão (rompers)','3m', 4,NULL,'Macacão','neutral',60),
  ('romper','Macacão curto/verão (rompers)','6m', 3,NULL,'Macacão','neutral',60),
  ('romper','Macacão curto/verão (rompers)','9m', 1,NULL,'Macacão','neutral',60),
  ('romper','Macacão curto/verão (rompers)','12m',2,NULL,'Macacão','neutral',60),
  -- Luvinhas e gorrinhos
  ('luvinha','Luvinhas','nb',3,NULL,'Acessório','neutral',70),
  ('luvinha','Luvinhas','6m',1,NULL,'Acessório','neutral',70),
  ('gorrinho','Gorrinhos','nb',3,NULL,'Acessório','neutral',71),
  -- Chapéu / Boné / Gorro
  ('chapeu','Chapéu/Boné/Gorro','3m', 1,'1 p/sol','Acessório','neutral',72),
  ('chapeu','Chapéu/Boné/Gorro','6m', 1,'1 p/sol','Acessório','neutral',72),
  ('chapeu','Chapéu/Boné/Gorro','9m', 2,'2 p/frio','Acessório','neutral',72),
  ('chapeu','Chapéu/Boné/Gorro','12m',2,'1 p/frio e 1 p/sol','Acessório','neutral',72),
  -- Meias (pares)
  ('meia','Meias (pares)','nb', 6,NULL,'Calçado','neutral',80),
  ('meia','Meias (pares)','3m', 6,NULL,'Calçado','neutral',80),
  ('meia','Meias (pares)','6m', 6,NULL,'Calçado','neutral',80),
  ('meia','Meias (pares)','9m', 6,NULL,'Calçado','neutral',80),
  ('meia','Meias (pares)','12m',6,NULL,'Calçado','neutral',80),
  -- Sapatinhos / Sandálias
  ('sapato','Sapatinhos/Sandálias','3m', 1,NULL,'Calçado','neutral',81),
  ('sapato','Sapatinhos/Sandálias','6m', 2,NULL,'Calçado','neutral',81),
  ('sapato','Sapatinhos/Sandálias','9m', 2,NULL,'Calçado','neutral',81),
  ('sapato','Sapatinhos/Sandálias','12m',2,NULL,'Calçado','neutral',81),
  -- Tênis
  ('tenis','Tênis','9m', 1,NULL,'Calçado','neutral',82),
  ('tenis','Tênis','12m',2,NULL,'Calçado','neutral',82),
  -- Óculos de sol
  ('oculos','Óculos de sol','12m',1,NULL,'Acessório','neutral',90),
  -- Praia
  ('praia','Roupa para praia e piscina','12m',1,NULL,'Lazer','neutral',91),
  -- Calça social / legging (vira "jogger" na versão masculina através de rename)
  ('legging','Calça social/legging','3m', 2,NULL,'Parte de baixo','neutral',100),
  ('legging','Calça social/legging','6m', 2,NULL,'Parte de baixo','neutral',100),
  ('legging','Calça social/legging','9m', 3,NULL,'Parte de baixo','neutral',100),
  ('legging','Calça social/legging','12m',2,NULL,'Parte de baixo','neutral',100),
  -- Jaqueta
  ('jaqueta','Jaqueta de frio/vento (Nylon)','9m',1,NULL,'Casaco','neutral',110),
  -- Colete
  ('colete','Colete (Veste)','9m', 1,NULL,'Casaco','neutral',111),
  ('colete','Colete (Veste)','12m',1,NULL,'Casaco','neutral',111),
  -- Casaco lã/linha
  ('casaco','Casaco de lã / linha / algodão','nb', 2,NULL,'Casaco','neutral',112),
  ('casaco','Casaco de lã / linha / algodão','3m', 2,NULL,'Casaco','neutral',112),
  ('casaco','Casaco de lã / linha / algodão','6m', 3,NULL,'Casaco','neutral',112),
  ('casaco','Casaco de lã / linha / algodão','9m', 4,NULL,'Casaco','neutral',112),
  ('casaco','Casaco de lã / linha / algodão','12m',3,NULL,'Casaco','neutral',112),
  -- Moletom
  ('moletom','Conjunto de moletom','3m',1,NULL,'Casaco','neutral',113),
  ('moletom','Conjunto de moletom','6m',1,NULL,'Casaco','neutral',113),
  ('moletom','Conjunto de moletom','9m',2,NULL,'Casaco','neutral',113),
  -- Saída de maternidade
  ('saida_mat','Saída de maternidade/looks maternidade','nb',5,'4 a 6 looks','Especial','neutral',200);

-- ------------------------------------------------------------
-- 9) SEED: Templates FEMININOS (aparecem só em gender = 'girl')
-- ------------------------------------------------------------
INSERT INTO item_templates (code, name, size_id, target, note, category, gender, sort_order) VALUES
  -- Camiseta/polo manga curta
  ('top_mc_g','Blusinha e camiseta manga curta','6m', 5,'3 camiseta / 2 blusinha','Parte de cima','girl',120),
  ('top_mc_g','Blusinha e camiseta manga curta','9m', 4,'2 camiseta / 2 blusinha','Parte de cima','girl',120),
  ('top_mc_g','Blusinha e camiseta manga curta','12m',5,'3 camiseta / 2 blusinha','Parte de cima','girl',120),
  -- Camiseta/polo manga longa
  ('top_ml_g','Blusinha e camiseta manga longa','6m', 4,'2 camiseta / 2 blusinha','Parte de cima','girl',121),
  ('top_ml_g','Blusinha e camiseta manga longa','9m', 7,'4 camiseta / 3 blusinha','Parte de cima','girl',121),
  ('top_ml_g','Blusinha e camiseta manga longa','12m',5,'3 camiseta / 2 blusinha','Parte de cima','girl',121),
  -- Bata / blusinha arrumada
  ('bata','Bata / Blusinha + arrumada','6m', 2,NULL,'Parte de cima','girl',122),
  ('bata','Bata / Blusinha + arrumada','9m', 2,NULL,'Parte de cima','girl',122),
  ('bata','Bata / Blusinha + arrumada','12m',2,NULL,'Parte de cima','girl',122),
  -- Shorts / saias
  ('short_saia','Shorts / Saias','3m', 3,NULL,'Parte de baixo','girl',130),
  ('short_saia','Shorts / Saias','6m', 2,NULL,'Parte de baixo','girl',130),
  ('short_saia','Shorts / Saias','9m', 2,NULL,'Parte de baixo','girl',130),
  ('short_saia','Shorts / Saias','12m',3,NULL,'Parte de baixo','girl',130),
  -- Jardineira
  ('jardineira','Jardineira','3m', 1,NULL,'Parte de baixo','girl',131),
  ('jardineira','Jardineira','6m', 1,NULL,'Parte de baixo','girl',131),
  ('jardineira','Jardineira','9m', 1,NULL,'Parte de baixo','girl',131),
  ('jardineira','Jardineira','12m',1,NULL,'Parte de baixo','girl',131),
  -- Calça jeans
  ('jeans_g','Calça jeans','6m', 1,NULL,'Parte de baixo','girl',132),
  ('jeans_g','Calça jeans','9m', 1,NULL,'Parte de baixo','girl',132),
  ('jeans_g','Calça jeans','12m',1,NULL,'Parte de baixo','girl',132),
  -- Vestidos dia a dia
  ('vestido','Vestidos (dia a dia)','3m', 3,NULL,'Vestido','girl',140),
  ('vestido','Vestidos (dia a dia)','6m', 3,NULL,'Vestido','girl',140),
  ('vestido','Vestidos (dia a dia)','9m', 3,NULL,'Vestido','girl',140),
  ('vestido','Vestidos (dia a dia)','12m',3,NULL,'Vestido','girl',140),
  -- Vestidos festa
  ('vestido_festa','Vestidos (arrumadinhos/festa)','6m', 2,NULL,'Vestido','girl',141),
  ('vestido_festa','Vestidos (arrumadinhos/festa)','9m', 2,NULL,'Vestido','girl',141),
  ('vestido_festa','Vestidos (arrumadinhos/festa)','12m',3,NULL,'Vestido','girl',141),
  -- Meia calça / lacinhos
  ('meia_calca','Meia calça e lacinhos','3m', 1,'Kit de lacinhos','Acessório','girl',150),
  ('meia_calca','Meia calça e lacinhos','6m', 1,'Kit de lacinhos','Acessório','girl',150),
  ('meia_calca','Meia calça e lacinhos','9m', 3,'3 meia-calça','Acessório','girl',150),
  ('meia_calca','Meia calça e lacinhos','12m',1,'Kit de lacinhos','Acessório','girl',150);

-- ------------------------------------------------------------
-- 10) SEED: Templates MASCULINOS (aparecem só em gender = 'boy')
-- ------------------------------------------------------------
INSERT INTO item_templates (code, name, size_id, target, note, category, gender, sort_order) VALUES
  -- Camiseta/polo manga curta
  ('top_mc_b','Camiseta e Polo manga curta','6m', 5,'3 camiseta / 2 polo','Parte de cima','boy',120),
  ('top_mc_b','Camiseta e Polo manga curta','9m', 4,'2 camiseta / 2 polo','Parte de cima','boy',120),
  ('top_mc_b','Camiseta e Polo manga curta','12m',5,'3 camiseta / 2 polo','Parte de cima','boy',120),
  -- Camiseta/polo manga longa
  ('top_ml_b','Camiseta e Polo manga longa','6m', 4,'2 camiseta / 2 polo','Parte de cima','boy',121),
  ('top_ml_b','Camiseta e Polo manga longa','9m', 7,'4 camiseta / 3 polo','Parte de cima','boy',121),
  ('top_ml_b','Camiseta e Polo manga longa','12m',5,'3 camiseta / 2 polo','Parte de cima','boy',121),
  -- Camisa social (p/fotos/evento)
  ('camisa_social','Camisa social (botão)','6m', 1,'1 p/festa','Parte de cima','boy',122),
  ('camisa_social','Camisa social (botão)','9m', 1,NULL,'Parte de cima','boy',122),
  ('camisa_social','Camisa social (botão)','12m',2,'1 manga curta / 1 manga longa','Parte de cima','boy',122),
  -- Shorts / bermudas
  ('bermuda','Bermudas / Shorts','3m', 3,NULL,'Parte de baixo','boy',130),
  ('bermuda','Bermudas / Shorts','6m', 2,NULL,'Parte de baixo','boy',130),
  ('bermuda','Bermudas / Shorts','9m', 2,NULL,'Parte de baixo','boy',130),
  ('bermuda','Bermudas / Shorts','12m',3,NULL,'Parte de baixo','boy',130),
  -- Jardineira masculina
  ('jardineira_b','Jardineira','3m', 1,NULL,'Parte de baixo','boy',131),
  ('jardineira_b','Jardineira','6m', 1,NULL,'Parte de baixo','boy',131),
  ('jardineira_b','Jardineira','9m', 1,NULL,'Parte de baixo','boy',131),
  ('jardineira_b','Jardineira','12m',1,NULL,'Parte de baixo','boy',131),
  -- Calça jeans
  ('jeans_b','Calça jeans','6m', 1,NULL,'Parte de baixo','boy',132),
  ('jeans_b','Calça jeans','9m', 1,NULL,'Parte de baixo','boy',132),
  ('jeans_b','Calça jeans','12m',1,NULL,'Parte de baixo','boy',132),
  -- Calça jogger/moletom (substitui meia-calça da versão feminina)
  ('jogger','Calça jogger/moletom','3m', 1,NULL,'Parte de baixo','boy',133),
  ('jogger','Calça jogger/moletom','6m', 1,NULL,'Parte de baixo','boy',133),
  ('jogger','Calça jogger/moletom','9m', 2,NULL,'Parte de baixo','boy',133),
  ('jogger','Calça jogger/moletom','12m',2,NULL,'Parte de baixo','boy',133),
  -- Gravata borboleta / suspensório (item especial)
  ('suspensorio','Kit suspensório ou gravata borboleta','6m', 1,'Para fotos/festa','Acessório','boy',150),
  ('suspensorio','Kit suspensório ou gravata borboleta','12m',1,NULL,'Acessório','boy',150),
  -- Conjunto esportivo
  ('conj_esporte','Conjunto esportivo (regata/shorts)','6m', 1,NULL,'Conjunto','boy',151),
  ('conj_esporte','Conjunto esportivo (regata/shorts)','9m', 1,NULL,'Conjunto','boy',151),
  ('conj_esporte','Conjunto esportivo (regata/shorts)','12m',2,NULL,'Conjunto','boy',151);

-- ------------------------------------------------------------
-- 11) (opcional) Limpeza da V1: tabela antiga com linha única.
-- Não removemos automaticamente — deixe intacto se houver dados
-- que você quer manter. Você pode rodar manualmente:
--   DELETE FROM preferences WHERE user_id IS NULL;
-- ------------------------------------------------------------

ALTER TABLE users       DISABLE ROW LEVEL SECURITY;
ALTER TABLE sizes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE items       DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_templates DISABLE ROW LEVEL SECURITY;
