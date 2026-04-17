-- ============================================================
-- ENXOVAL DA LUIZA - Schema do banco de dados
-- ============================================================
-- Execute este SQL no Supabase SQL Editor para criar a estrutura
-- Dashboard: https://supabase.com/dashboard → SQL Editor → New query
-- ============================================================

-- Tabela de tamanhos (NB, 3M, 6M, 9M, 12M)
CREATE TABLE IF NOT EXISTS sizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tam TEXT NOT NULL,
  season TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens do enxoval
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size_id TEXT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
  target INT NOT NULL DEFAULT 1,
  bought INT NOT NULL DEFAULT 0,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_size_id ON items(size_id);
CREATE INDEX IF NOT EXISTS idx_items_updated_at ON items(updated_at DESC);

-- Tabela de preferências (filtro ativo, seções colapsadas, etc.)
CREATE TABLE IF NOT EXISTS preferences (
  id INT PRIMARY KEY DEFAULT 1,
  filter TEXT DEFAULT 'all',
  collapsed JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Trigger para atualizar updated_at automaticamente
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
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON preferences;
CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inicializar linha única de preferências
INSERT INTO preferences (id, filter, collapsed)
VALUES (1, 'all', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Tamanhos
-- ============================================================
INSERT INTO sizes (id, name, tam, season, display_order) VALUES
  ('nb',  'RN – 1 mês',    'NB',       'Primavera',          1),
  ('3m',  '1 a 3 meses',   '3M (P)',   'Primavera/Verão',    2),
  ('6m',  '3 a 6 meses',   '6M (M)',   'Verão/Outono',       3),
  ('9m',  '6 a 9 meses',   '9M (G)',   'Outono/Inverno',     4),
  ('12m', '9 a 12 meses',  '12M (GG)', 'Inverno/Primavera',  5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: Itens padrão (baseado na lista de enxoval)
-- ============================================================
INSERT INTO items (id, name, size_id, target, note) VALUES
  -- Macacão comprido
  ('i1',  'Macacão comprido (com pé ou sem pé)', 'nb',  6, NULL),
  ('i2',  'Macacão comprido (com pé ou sem pé)', '3m',  7, NULL),
  ('i3',  'Macacão comprido (com pé ou sem pé)', '6m',  7, NULL),
  ('i4',  'Macacão comprido (com pé ou sem pé)', '9m',  7, NULL),
  ('i5',  'Macacão comprido (com pé ou sem pé)', '12m', 4, NULL),
  -- Saco de dormir / Pijama
  ('i6',  'Saco de dormir e Conjunto Pijama', 'nb',  3, '3 swaddles 0-3m'),
  ('i7',  'Saco de dormir e Conjunto Pijama', '3m',  2, '2 sacos de dormir 0-3m'),
  ('i8',  'Saco de dormir e Conjunto Pijama', '6m',  2, '2 sacos de dormir 3-6m'),
  ('i9',  'Saco de dormir e Conjunto Pijama', '9m',  2, '2 sacos de dormir 6-12m'),
  ('i10', 'Saco de dormir e Conjunto Pijama', '12m', 4, '4 conjuntos'),
  -- Body branco manga longa
  ('i11', 'Body branco manga longa', 'nb',  4, NULL),
  ('i12', 'Body branco manga longa', '3m',  4, NULL),
  ('i13', 'Body branco manga longa', '6m',  4, NULL),
  ('i14', 'Body branco manga longa', '9m',  4, NULL),
  ('i15', 'Body branco manga longa', '12m', 4, NULL),
  -- Body branco manga curta
  ('i16', 'Body branco manga curta', 'nb',  5, NULL),
  ('i17', 'Body branco manga curta', '3m',  5, NULL),
  ('i18', 'Body branco manga curta', '6m',  5, NULL),
  ('i19', 'Body branco manga curta', '9m',  5, NULL),
  ('i20', 'Body branco manga curta', '12m', 5, NULL),
  -- Body colorido manga longa
  ('i21', 'Body colorido manga longa', 'nb',  4, NULL),
  ('i22', 'Body colorido manga longa', '3m',  4, NULL),
  ('i23', 'Body colorido manga longa', '6m',  4, NULL),
  ('i24', 'Body colorido manga longa', '9m',  4, NULL),
  ('i25', 'Body colorido manga longa', '12m', 4, NULL),
  -- Body colorido manga curta
  ('i26', 'Body colorido manga curta', 'nb',  5, NULL),
  ('i27', 'Body colorido manga curta', '3m',  5, NULL),
  ('i28', 'Body colorido manga curta', '6m',  5, NULL),
  ('i29', 'Body colorido manga curta', '9m',  5, NULL),
  ('i30', 'Body colorido manga curta', '12m', 5, NULL),
  -- Calças de malha
  ('i31', 'Calças de malha combinando com bodies', 'nb',  6, NULL),
  ('i32', 'Calças de malha combinando com bodies', '3m',  6, NULL),
  ('i33', 'Calças de malha combinando com bodies', '6m',  6, NULL),
  ('i34', 'Calças de malha combinando com bodies', '9m',  6, NULL),
  ('i35', 'Calças de malha combinando com bodies', '12m', 6, NULL),
  -- Conjunto 3 peças
  ('i36', 'Conjunto de 3 peças (calça e 2 bodies)', 'nb',  2, NULL),
  ('i37', 'Conjunto de 3 peças (calça e 2 bodies)', '3m',  2, NULL),
  ('i38', 'Conjunto de 3 peças (calça e 2 bodies)', '6m',  2, NULL),
  ('i39', 'Conjunto de 3 peças (calça e 2 bodies)', '9m',  2, NULL),
  ('i40', 'Conjunto de 3 peças (calça e 2 bodies)', '12m', 2, NULL),
  -- Macacão curto/verão
  ('i41', 'Macacão curto/verão (rompers)', 'nb',  1, NULL),
  ('i42', 'Macacão curto/verão (rompers)', '3m',  4, NULL),
  ('i43', 'Macacão curto/verão (rompers)', '6m',  3, NULL),
  ('i44', 'Macacão curto/verão (rompers)', '9m',  1, NULL),
  ('i45', 'Macacão curto/verão (rompers)', '12m', 2, NULL),
  -- Luvinhas e gorrinhos
  ('i46', 'Luvinhas',  'nb', 3, NULL),
  ('i47', 'Luvinhas',  '6m', 1, NULL),
  ('i48', 'Gorrinhos', 'nb', 3, NULL),
  -- Chapéu/Boné/Gorro
  ('i49', 'Chapéu/Boné/Gorro', '3m',  1, '1 p/sol'),
  ('i50', 'Chapéu/Boné/Gorro', '6m',  1, '1 p/sol'),
  ('i51', 'Chapéu/Boné/Gorro', '9m',  2, '2 p/frio'),
  ('i52', 'Chapéu/Boné/Gorro', '12m', 2, '1 p/frio e 1 p/sol'),
  -- Meias
  ('i53', 'Meias (pares)', 'nb',  6, NULL),
  ('i54', 'Meias (pares)', '3m',  6, NULL),
  ('i55', 'Meias (pares)', '6m',  6, NULL),
  ('i56', 'Meias (pares)', '9m',  6, NULL),
  ('i57', 'Meias (pares)', '12m', 6, NULL),
  -- Sapatinhos/Sandálias
  ('i58', 'Sapatinhos/Sandálias', '3m',  1, NULL),
  ('i59', 'Sapatinhos/Sandálias', '6m',  2, NULL),
  ('i60', 'Sapatinhos/Sandálias', '9m',  2, NULL),
  ('i61', 'Sapatinhos/Sandálias', '12m', 2, NULL),
  -- Tênis
  ('i62', 'Tênis', '9m',  1, NULL),
  ('i63', 'Tênis', '12m', 2, NULL),
  -- Óculos
  ('i64', 'Óculos de sol', '12m', 1, NULL),
  -- Praia
  ('i65', 'Roupa para praia e piscina', '12m', 1, NULL),
  -- Jardineira
  ('i66', 'Jardineira', '3m',  1, NULL),
  ('i67', 'Jardineira', '6m',  1, NULL),
  ('i68', 'Jardineira', '9m',  1, NULL),
  ('i69', 'Jardineira', '12m', 1, NULL),
  -- Camiseta/Polo manga curta
  ('i70', 'Camiseta e Polo manga curta', '6m',  5, '3 camiseta / 2 polo'),
  ('i71', 'Camiseta e Polo manga curta', '9m',  4, '2 camiseta / 2 polo'),
  ('i72', 'Camiseta e Polo manga curta', '12m', 5, '3 camiseta / 2 polo'),
  -- Camiseta/Polo manga longa
  ('i73', 'Camiseta e Polo manga longa', '6m',  4, '2 camiseta / 2 polo'),
  ('i74', 'Camiseta e Polo manga longa', '9m',  7, '4 camiseta / 3 polo'),
  ('i75', 'Camiseta e Polo manga longa', '12m', 5, '3 camiseta / 2 polo'),
  -- Bata/Blusinha
  ('i76', 'Bata / Blusinha + arrumada', '6m',  2, NULL),
  ('i77', 'Bata / Blusinha + arrumada', '9m',  2, NULL),
  ('i78', 'Bata / Blusinha + arrumada', '12m', 2, NULL),
  -- Shorts/Saias
  ('i79', 'Shorts / Saias', '3m',  3, NULL),
  ('i80', 'Shorts / Saias', '6m',  2, NULL),
  ('i81', 'Shorts / Saias', '9m',  2, NULL),
  ('i82', 'Shorts / Saias', '12m', 3, NULL),
  -- Calça jeans
  ('i83', 'Calça jeans', '6m',  1, NULL),
  ('i84', 'Calça jeans', '9m',  1, NULL),
  ('i85', 'Calça jeans', '12m', 1, NULL),
  -- Calça social/legging
  ('i86', 'Calça social/legging', '3m',  2, NULL),
  ('i87', 'Calça social/legging', '6m',  2, NULL),
  ('i88', 'Calça social/legging', '9m',  3, NULL),
  ('i89', 'Calça social/legging', '12m', 2, NULL),
  -- Jaqueta/colete
  ('i90', 'Jaqueta de frio/vento (Nylon)', '9m',  1, NULL),
  ('i91', 'Colete (Veste)', '9m',  1, NULL),
  ('i92', 'Colete (Veste)', '12m', 1, NULL),
  -- Casaco
  ('i93', 'Casaco de lã / linha / algodão', 'nb',  2, NULL),
  ('i94', 'Casaco de lã / linha / algodão', '3m',  2, NULL),
  ('i95', 'Casaco de lã / linha / algodão', '6m',  3, NULL),
  ('i96', 'Casaco de lã / linha / algodão', '9m',  4, NULL),
  ('i97', 'Casaco de lã / linha / algodão', '12m', 3, NULL),
  -- Moletom
  ('i98',  'Conjunto de moletom', '3m', 1, NULL),
  ('i99',  'Conjunto de moletom', '6m', 1, NULL),
  ('i100', 'Conjunto de moletom', '9m', 2, NULL),
  -- Vestidos dia a dia
  ('i101', 'Vestidos (dia a dia)', '3m',  3, NULL),
  ('i102', 'Vestidos (dia a dia)', '6m',  3, NULL),
  ('i103', 'Vestidos (dia a dia)', '9m',  3, NULL),
  ('i104', 'Vestidos (dia a dia)', '12m', 3, NULL),
  -- Vestidos festa
  ('i105', 'Vestidos (arrumadinhos/festa)', '6m',  2, NULL),
  ('i106', 'Vestidos (arrumadinhos/festa)', '9m',  2, NULL),
  ('i107', 'Vestidos (arrumadinhos/festa)', '12m', 3, NULL),
  -- Meia calça/lacinhos
  ('i108', 'Meia calça e lacinhos', '3m',  1, 'Kit de lacinhos'),
  ('i109', 'Meia calça e lacinhos', '6m',  1, 'Kit de lacinhos'),
  ('i110', 'Meia calça e lacinhos', '9m',  3, '3 meia-calça'),
  ('i111', 'Meia calça e lacinhos', '12m', 1, 'Kit de lacinhos'),
  -- Saída de maternidade
  ('i112', 'Saída de maternidade/looks maternidade', 'nb', 5, '4 a 6 looks')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Row Level Security (RLS) - desabilitado pra simplicidade
-- Como não tem login, deixamos o acesso público
-- As permissões são controladas pela anon key do Supabase
-- ============================================================
ALTER TABLE sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferences DISABLE ROW LEVEL SECURITY;
