// Configuração de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.CORS_ORIGINS = '*';

// Configurações de teste para Supabase (usar valores de teste)
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Configurações de teste para Gemini
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Configurações de segurança para testes
process.env.SECRET_KEY = 'test-secret-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// Rate limiting para testes (mais permissivo)
process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minuto
process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // 1000 requests

