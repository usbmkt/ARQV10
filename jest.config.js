module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',

  // Padrão de arquivos de teste
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Diretórios a serem ignorados
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Configuração de cobertura
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],

  // Arquivos para análise de cobertura
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Excluir arquivo principal
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Limites de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup antes dos testes
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout para testes
  testTimeout: 30000,

  // Configurações adicionais
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,

  // Transformações
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Variáveis de ambiente para testes
  setupFiles: ['<rootDir>/tests/env.setup.js']
};

