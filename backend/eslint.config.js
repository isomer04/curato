// @ts-check
const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.js'],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Spread the flat/recommended-type-checked config (includes parser, plugin, and type-checked rules)
  .../** @type {import('eslint').Linter.Config[]} */ (
    tsPlugin.configs['flat/recommended-type-checked']
  ),

  // Project-specific overrides for all TypeScript source files
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.eslint.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // Test file overrides — allow `any` types in tests
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Prettier must be last to disable formatting rules
  prettierConfig,
];
