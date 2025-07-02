const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

// Cliente público (para operações autenticadas)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo (para operações que requerem privilégios elevados)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Função para testar conexão
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Erro ao conectar com Supabase:', error);
      return false;
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    return true;
  } catch (error) {
    console.error('Erro de conexão:', error);
    return false;
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
};

