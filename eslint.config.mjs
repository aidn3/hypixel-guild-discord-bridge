import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-plugin-prettier/recommended'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

//TODO: add functionality one day when it is supported
// requireExtensions from 'eslint-plugin-require-extensions'

/**
 * Credit: https://github.com/Callanplays (Discord: callanftw)
 *   for helping with migrating to eslint-v9
 */
export default [
  {
    ignores: ['**/node_modules', '.idea', './logs', './config', '**/*-ti.ts', 'package-lock.json', 'eslint.config.mjs']
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  eslintPluginUnicorn.configs.recommended,
  prettier,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='console']",
          message: 'usage of console object is not allowed. use node:assert or logger4j instead'
        }
      ],
      'unicorn/no-process-exit': 0,
      'unicorn/prefer-single-call': 0,
      'unicorn/filename-case': 2,
      'no-use-before-define': 0,
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          named: true,
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],
      'import/no-unresolved': 2,
      'import/no-cycle': 2,
      'import/newline-after-import': 2,
      'import/no-extraneous-dependencies': 2,
      '@typescript-eslint/consistent-type-imports': 2,
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: false
        }
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
          format: ['camelCase']
        },
        {
          selector: ['class', 'interface', 'enum', 'typeAlias'],
          format: ['PascalCase']
        },
        {
          selector: ['typeParameter'],
          format: null,
          custom: {
            match: true,
            regex: '^([A-Z])$'
          }
        },
        {
          selector: ['import'],
          format: null
        },
        {
          selector: ['classProperty'],
          format: null,
          custom: {
            match: true,
            regex: '^([A-Z]{1,3}[a-z0-9]+)+$'
          },
          modifiers: ['static']
        },
        {
          selector: ['variable'],
          format: ['PascalCase', 'camelCase'],
          modifiers: ['const']
        },
        {
          selector: ['variable'],
          format: null,
          custom: {
            match: true,
            regex: '^([A-Z]{1,3}[a-z0-9]+)+$'
          },
          modifiers: ['const', 'global']
        },
        {
          selector: ['enumMember'],
          format: null,
          custom: {
            match: true,
            regex: '^([A-Z]{1,3}[a-z0-9]+)+$'
          }
        }
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true
        }
      ],
      'unicorn/no-useless-undefined': [
        'error',
        {
          checkArguments: false,
          checkArrowFunctionBody: false
        }
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: 'src/common',
              from: ['src/instance', 'src/plugins', 'src/types', 'src/utility'],
              message: 'Common files are used as public api and must not reference internal files'
            },
            {
              target: 'src/plugins',
              from: [
                'src/types',
                'src/plugins',
                'src/instance/commands',
                'src/instance/discord',
                'src/instance/logger',
                'src/instance/metrics',
                'src/instance/minecraft',
                'src/instance/socket'
              ],
              message: 'Plugin files must not reference other plugins or outside files'
            },
            {
              target: 'src/types',
              from: ['src'],
              message: 'Type files must only reference published libraries'
            },
            {
              target: 'src/utility',
              from: ['src/instance', 'src/types'],
              message:
                'Util must only reference other common files. Specific utility can be put in their respective instance common dir.'
            },
            {
              target: 'src/instance/commands',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/discord',
                'src/instance/logger',
                'src/instance/metrics',
                'src/instance/minecraft',
                'src/instance/moderation',
                'src/instance/socket'
              ],
              message: 'Instance must only access itself and common files'
            },
            {
              target: 'src/instance/discord',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/commands',
                'src/instance/logger',
                'src/instance/metrics',
                'src/instance/minecraft',
                'src/instance/socket'
              ],
              message: 'Instance must only access itself and common files'
            },
            {
              target: 'src/instance/logger',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/commands',
                'src/instance/discord',
                'src/instance/metrics',
                'src/instance/minecraft',
                'src/instance/moderation',
                'src/instance/socket'
              ],
              message: 'Instance must only access itself and common files'
            },
            {
              target: 'src/instance/metrics',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/commands',
                'src/instance/discord',
                'src/instance/logger',
                'src/instance/minecraft',
                'src/instance/moderation',
                'src/instance/socket'
              ],
              message: 'Instance must only access itself and common files'
            },
            {
              target: 'src/instance/minecraft',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/commands',
                'src/instance/discord',
                'src/instance/logger',
                'src/instance/metrics',
                'src/instance/moderation',
                'src/instance/socket'
              ],
              message: 'Instance must only access itself and common files'
            },
            {
              target: 'src/instance/moderation',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/commands',
                'src/instance/discord',
                'src/instance/logger',
                'src/instance/metrics',
                'src/instance/minecraft',
                'src/instance/socket'
              ],
              message: 'Instance must only access itself and common files'
            },
            {
              target: 'src/instance/socket',
              from: [
                'src/plugins',
                'src/types',
                'src/instance/commands',
                'src/instance/discord',
                'src/instance/logger',
                'src/instance/metrics',
                'src/instance/minecraft',
                'src/instance/moderation'
              ],
              message: 'Instance must only access itself and common files'
            }
          ]
        }
      ]
    },

    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },

      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
        }
      }
    }
  }
]
