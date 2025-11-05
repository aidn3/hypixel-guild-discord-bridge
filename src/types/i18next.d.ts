import 'i18next'

import type Translations from '../../resources/locales/en.json' with { type: 'json' }

declare module 'i18next' {
  interface CustomTypeOptions {
    enableSelector: true
    defaultNS: 'en'

    resources: {
      en: typeof Translations
    }
  }
}
