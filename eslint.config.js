import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const layer = (dir, banned) => ({
  files: [`${dir}/**/*.ts`],
  rules: {
    'no-restricted-imports': ['error', { patterns: banned.map((b) => ({ group: [`**/${b}/**`, `../${b}/*`, `./${b}/*`], message: `الطبقات باتجاه واحد: ${dir} لا يستورد ${b}` })) }],
  },
});

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.wrangler', 'migrations'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 3],
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  { files: ['**/*.test.ts', 'tests/**/*.ts'], rules: { 'max-lines-per-function': 'off' } },
  layer('shared', ['worker', 'web']),
  layer('worker/repo', ['services', 'routes', 'web']),
  layer('worker/services', ['routes', 'web']),
  layer('worker/db', ['repo', 'services', 'routes', 'web']),
  layer('web', ['worker']),
);
