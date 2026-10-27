import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { console: 'readonly' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { console: 'readonly' } },
  },
  { ignores: ['dist/**', 'node_modules/**'] },
);
