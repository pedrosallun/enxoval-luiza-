-- ============================================================
-- MIGRAÇÃO V1 → V2
-- ============================================================
-- Roda isto UMA VEZ no SQL Editor do Supabase se você já tinha
-- o banco v1 (com a tabela preferences de linha única id=1).
--
-- O CREATE TABLE IF NOT EXISTS do schema_v2.sql não altera tabelas
-- existentes, então a preferences antiga continuou com PK=id, e
-- isso quebra o upsert do endpoint /api/preferences quando você
-- clica no chevron ou filtro.
--
-- Este script:
--   1. Remove a linha única antiga e a constraint single_row.
--   2. Dropa a PK antiga (id) e cria nova PK em user_id.
--   3. Deixa as colunas com os defaults v2.
-- ============================================================

BEGIN;

-- Remove a linha antiga (id=1) que não tem user_id
DELETE FROM preferences WHERE user_id IS NULL;

-- Remove o constraint single_row (v1) se ainda existir
ALTER TABLE preferences DROP CONSTRAINT IF EXISTS single_row;

-- Remove a PK antiga (id) se existir
ALTER TABLE preferences DROP CONSTRAINT IF EXISTS preferences_pkey;

-- Remove a coluna id antiga se existir
ALTER TABLE preferences DROP COLUMN IF EXISTS id;

-- Garante que user_id é NOT NULL
ALTER TABLE preferences ALTER COLUMN user_id SET NOT NULL;

-- Cria PK em user_id (se não já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'preferences_pkey'
      AND conrelid = 'preferences'::regclass
  ) THEN
    ALTER TABLE preferences ADD CONSTRAINT preferences_pkey PRIMARY KEY (user_id);
  END IF;
END$$;

-- Garante FK pra users com ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'preferences_user_id_fkey'
      AND conrelid = 'preferences'::regclass
  ) THEN
    ALTER TABLE preferences
      ADD CONSTRAINT preferences_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Limpa items antigos da v1 (sem user_id) se quiser começar do zero.
-- COMENTADO por segurança — descomente se tiver certeza que não quer
-- preservar os dados antigos da Luiza:
-- DELETE FROM items WHERE user_id IS NULL;

COMMIT;

-- ============================================================
-- Depois de rodar, confira:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'preferences';
-- Deve mostrar: user_id (text), filter (text), collapsed (jsonb),
--                updated_at (timestamptz)
-- SEM a coluna 'id'.
-- ============================================================
