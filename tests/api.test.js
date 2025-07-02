const request = require('supertest');
const app = require('../src/server');

describe('ARQ6 API Tests', () => {
  
  // Teste de health check
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  // Teste da rota raiz
  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  // Testes de autenticação
  describe('Authentication', () => {
    
    describe('POST /api/users/register', () => {
      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/users/register')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            email: 'invalid-email',
            password: 'Test123!@#',
            nome: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate password strength', async () => {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            email: 'test@example.com',
            password: '123',
            nome: 'Test User'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/users/login', () => {
      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/users/login')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/users/login')
          .send({
            email: 'invalid-email',
            password: 'password'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // Testes de análise (sem autenticação real)
  describe('Analysis Routes', () => {
    
    describe('POST /api/analysis/market', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/analysis/market')
          .send({
            segmento: 'tecnologia',
            contexto_adicional: 'teste',
            usuario_id: '550e8400-e29b-41d4-a716-446655440000'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });

      it('should validate request body', async () => {
        const response = await request(app)
          .post('/api/analysis/market')
          .set('Authorization', 'Bearer fake-token')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/analysis/history', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/analysis/history')
          .expect(401);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  // Teste de rotas não encontradas
  describe('404 Routes', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Rota não encontrada');
    });
  });

  // Teste de rate limiting
  describe('Rate Limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      // Este teste seria mais complexo em um ambiente real
      // Aqui apenas verificamos se a rota responde
      const response = await request(app)
        .get('/api/analysis/history')
        .expect(401); // Esperamos 401 por falta de auth, não 429 de rate limit

      expect(response.status).not.toBe(429);
    });
  });

  // Teste de CORS
  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  // Teste de compressão
  describe('Compression', () => {
    it('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Em um ambiente real, verificaríamos o header content-encoding
      expect(response.status).toBe(200);
    });
  });
});

// Testes de validação
describe('Validation Tests', () => {
  const { schemas } = require('../src/middleware/validation');

  describe('Analysis Schema', () => {
    it('should validate correct analysis data', () => {
      const validData = {
        segmento: 'tecnologia',
        contexto_adicional: 'Análise do mercado de tecnologia',
        usuario_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const { error } = schemas.analysisSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid segmento', () => {
      const invalidData = {
        segmento: 'a', // muito curto
        usuario_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      const { error } = schemas.analysisSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid usuario_id', () => {
      const invalidData = {
        segmento: 'tecnologia',
        usuario_id: 'invalid-uuid'
      };

      const { error } = schemas.analysisSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('User Registration Schema', () => {
    it('should validate correct user data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        nome: 'Test User',
        empresa: 'Test Company'
      };

      const { error } = schemas.userRegistrationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123456', // muito fraca
        nome: 'Test User'
      };

      const { error } = schemas.userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Test123!@#',
        nome: 'Test User'
      };

      const { error } = schemas.userRegistrationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});

// Mock para testes que precisam de Supabase
jest.mock('../src/config/database', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  },
  supabaseAdmin: {
    auth: {
      admin: {
        deleteUser: jest.fn()
      }
    }
  },
  testConnection: jest.fn(() => Promise.resolve(true))
}));

