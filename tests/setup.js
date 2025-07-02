// Setup global para testes
require('dotenv').config({ path: '.env.test' });

// Configurar timeout global
jest.setTimeout(30000);

// Mock global para console em testes
const originalConsole = console;

beforeAll(() => {
  // Silenciar logs durante os testes (opcional)
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restaurar console original
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

// Configurações globais para testes
global.testConfig = {
  apiUrl: 'http://localhost:3000',
  testUser: {
    email: 'test@example.com',
    password: 'Test123!@#',
    nome: 'Test User',
    empresa: 'Test Company'
  },
  testAnalysis: {
    segmento: 'tecnologia',
    contexto_adicional: 'Teste de análise de mercado',
    usuario_id: '550e8400-e29b-41d4-a716-446655440000'
  }
};

// Helper functions para testes
global.testHelpers = {
  // Gerar dados de usuário aleatórios
  generateRandomUser: () => ({
    email: `test${Date.now()}@example.com`,
    password: 'Test123!@#',
    nome: `Test User ${Date.now()}`,
    empresa: 'Test Company'
  }),

  // Gerar UUID v4 simples para testes
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Aguardar um tempo específico
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Validar estrutura de resposta da API
  validateApiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    
    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('error');
    }
  }
};

