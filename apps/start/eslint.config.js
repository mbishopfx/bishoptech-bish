//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

const ALLOWED_LIB_ROOTS = [
  'backend',
  'frontend',
  'shared',
]

const ALLOWED_LIB_PATTERNS = ALLOWED_LIB_ROOTS.flatMap((root) => [
  `!@/lib/${root}`,
  `!@/lib/${root}/**`,
])

const CANONICAL_LIB_ROOT_RULE = [
  'error',
  {
    patterns: [
      {
        group: ['@/lib/**', ...ALLOWED_LIB_PATTERNS],
        message:
          'Only approved @/lib roots are allowed. Use a canonical namespace under @/lib.',
      },
    ],
  },
]

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      // The current app intentionally includes defensive checks around runtime
      // session/auth/data boundaries that static typing often narrows too aggressively.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Enforcing strict type-only import forms in this codebase causes broad churn
      // across tests and service modules without changing runtime semantics.
      '@typescript-eslint/consistent-type-imports': 'off',
      // Closure-heavy UI and test code frequently reuses short variable names in
      // nested scopes; disabling this keeps lint signal focused on functional issues.
      'no-shadow': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'no-restricted-imports': CANONICAL_LIB_ROOT_RULE,
    },
  },
  {
    files: ['src/lib/backend/**/*.ts', 'src/lib/backend/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/**', ...ALLOWED_LIB_PATTERNS],
              message:
                'Only approved @/lib roots are allowed. Use a canonical namespace under @/lib.',
            },
            {
              group: ['@/lib/frontend/*'],
              message:
                'Backend modules cannot import frontend modules. Move shared logic to @/lib/shared.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/shared/**/*.ts', 'src/lib/shared/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/**', ...ALLOWED_LIB_PATTERNS],
              message:
                'Only approved @/lib roots are allowed. Use a canonical namespace under @/lib.',
            },
            {
              group: ['@/lib/backend/*', '@/lib/frontend/*'],
              message:
                'Shared modules must remain isomorphic and cannot import backend or frontend layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lib/frontend/**/*.ts', 'src/lib/frontend/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/**', ...ALLOWED_LIB_PATTERNS],
              message:
                'Only approved @/lib roots are allowed. Use a canonical namespace under @/lib.',
            },
            {
              group: ['@/lib/backend/*'],
              message:
                'Frontend modules should not import backend modules directly. Use server/functions adapters.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/lib/frontend/**/*.server.ts',
      'src/lib/frontend/**/*.functions.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/**', ...ALLOWED_LIB_PATTERNS],
              message:
                'Only approved @/lib roots are allowed. Use a canonical namespace under @/lib.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/**/*.ts', 'src/components/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/**', ...ALLOWED_LIB_PATTERNS],
              message:
                'Only approved @/lib roots are allowed. Use a canonical namespace under @/lib.',
            },
            {
              group: ['@/lib/backend/*'],
              message:
                'Frontend and component code cannot import backend modules directly.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/paraglide/**',
      '.output/**',
    ],
  },
]
