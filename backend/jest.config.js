/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
    '^.+\\.js$': ['ts-jest', { diagnostics: false, isolatedModules: true }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@scure|@otplib|otplib|@noble)/)',
  ],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@dto/(.*)$': '<rootDir>/src/dto/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/tests/**/*',
    // Entry-point / generated templates
    '!src/app.ts',
    '!src/server.ts',
    '!src/templates/**/*',
    // Environment scaffolding
    '!src/config/env.ts',
    '!src/config/env.example.ts',
    // Barrel/re-export index files — no testable logic
    '!src/services/index.ts',
    '!src/utils/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  verbose: true,
  testTimeout: 10000,
};
