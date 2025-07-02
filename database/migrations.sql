-- Migração para o banco de dados ARQ6
-- Executar no Supabase SQL Editor

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    empresa VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de análises
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    segmento VARCHAR(100) NOT NULL,
    contexto_adicional TEXT,
    resultado TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_segmento ON analyses(segmento);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_analyses_updated_at ON analyses;
CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) para segurança
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas RLS para analyses
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
CREATE POLICY "Users can view own analyses" ON analyses
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own analyses" ON analyses;
CREATE POLICY "Users can insert own analyses" ON analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own analyses" ON analyses;
CREATE POLICY "Users can update own analyses" ON analyses
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own analyses" ON analyses;
CREATE POLICY "Users can delete own analyses" ON analyses
    FOR DELETE USING (auth.uid() = user_id);

-- Função para buscar estatísticas do usuário
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    total_analyses INTEGER;
    this_month_analyses INTEGER;
    top_segments JSON;
BEGIN
    -- Total de análises
    SELECT COUNT(*) INTO total_analyses
    FROM analyses
    WHERE user_id = user_uuid;
    
    -- Análises deste mês
    SELECT COUNT(*) INTO this_month_analyses
    FROM analyses
    WHERE user_id = user_uuid
    AND created_at >= date_trunc('month', CURRENT_DATE);
    
    -- Top 5 segmentos
    SELECT json_agg(
        json_build_object(
            'segmento', segmento,
            'count', count
        )
    ) INTO top_segments
    FROM (
        SELECT segmento, COUNT(*) as count
        FROM analyses
        WHERE user_id = user_uuid
        GROUP BY segmento
        ORDER BY count DESC
        LIMIT 5
    ) t;
    
    RETURN json_build_object(
        'totalAnalyses', COALESCE(total_analyses, 0),
        'thisMonth', COALESCE(this_month_analyses, 0),
        'topSegments', COALESCE(top_segments, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar análises relacionadas
CREATE OR REPLACE FUNCTION get_related_analyses(analysis_id UUID, segment_name VARCHAR, limit_count INTEGER DEFAULT 5)
RETURNS TABLE(
    id UUID,
    segmento VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.segmento, a.created_at
    FROM analyses a
    WHERE a.segmento ILIKE '%' || segment_name || '%'
    AND a.id != analysis_id
    ORDER BY a.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para estatísticas gerais (apenas para admins)
CREATE OR REPLACE VIEW admin_stats AS
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM analyses) as total_analyses,
    (SELECT COUNT(*) FROM analyses WHERE created_at >= CURRENT_DATE) as today_analyses,
    (SELECT COUNT(*) FROM analyses WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month_analyses;

-- Comentários nas tabelas
COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE analyses IS 'Tabela de análises de mercado realizadas';

COMMENT ON COLUMN users.id IS 'ID único do usuário (UUID)';
COMMENT ON COLUMN users.email IS 'Email do usuário (único)';
COMMENT ON COLUMN users.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN users.empresa IS 'Nome da empresa do usuário (opcional)';

COMMENT ON COLUMN analyses.id IS 'ID único da análise (UUID)';
COMMENT ON COLUMN analyses.user_id IS 'ID do usuário que criou a análise';
COMMENT ON COLUMN analyses.segmento IS 'Segmento de mercado analisado';
COMMENT ON COLUMN analyses.contexto_adicional IS 'Contexto adicional fornecido pelo usuário';
COMMENT ON COLUMN analyses.resultado IS 'Resultado da análise gerada pela IA';
COMMENT ON COLUMN analyses.metadata IS 'Metadados da análise (JSON)';

-- Inserir dados de exemplo (opcional - remover em produção)
-- INSERT INTO users (id, email, nome, empresa) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'admin@arq6.com', 'Administrador', 'ARQ6');

-- Verificar se as tabelas foram criadas corretamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('users', 'analyses')
ORDER BY table_name, ordinal_position;

