import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// O Genesis usa só os componentes do Astryx: misturar com shadcn/Tailwind é proibido
const outroDesignSystem = {
  group: ['tailwindcss', 'tailwind-merge', 'radix-ui', '@radix-ui/*', 'class-variance-authority', '@/components/ui/*'],
  message: 'O Genesis usa só o Astryx (docs/decisoes/0002-tema.md). Nada de shadcn/Tailwind.',
}

export default defineConfig(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'playwright-report',
      'test-results',
      'src/shared/design-system/tema/genesis.*',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Fronteiras da arquitetura (igual ao Tesserato, docs/decisoes/0001-arquitetura.md):
      // módulos se falam só pelo index.ts ou pelo domínio puro (dominio.ts)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*', '@/modules/*/**', '!@/modules/*/dominio'],
              message:
                'Importe o módulo pelo index.ts público (@/modules/<nome>) ou pelo domínio puro (@/modules/<nome>/dominio).',
            },
            outroDesignSystem,
          ],
        },
      ],
    },
  },
  {
    // Cor só por token: hex solto em componente é erro. O lugar do hex é o tema.
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'Cor só por token (var(--...)). Cor nova entra em shared/design-system/tema/genesisTheme.ts.',
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/modules/*', '@/app/*'], message: 'shared não pode depender de módulos nem do app.' },
            outroDesignSystem,
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts', 'src/modules/*/dominio.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', '@astryxdesign/*', '@/shared/design-system/*', '@/app/*'],
              message: 'O domínio é puro: sem React, sem tela, sem infraestrutura.',
            },
          ],
        },
      ],
    },
  },
  {
    // provedor + hooks de dados no mesmo arquivo é o padrão dos módulos
    files: ['src/modules/*/presentation/dados.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
