import type { i18n } from 'i18next'
import { createInstance } from 'i18next'

import Arabic from '../resources/locales/ar.json'
import German from '../resources/locales/de.json'
import English from '../resources/locales/en.json'

import { ApplicationLanguages } from './core/language-configurations'

export async function loadI18(): Promise<i18n> {
  const instance = createInstance({
    load: 'all',
    saveMissing: true,
    interpolation: { escapeValue: false },
    fallbackLng: ApplicationLanguages.English,
    resources: {
      [ApplicationLanguages.Arabic]: { translation: Arabic },
      [ApplicationLanguages.German]: { translation: German },
      [ApplicationLanguages.English]: { translation: English }
    }
  })

  await instance.init()
  return instance
}
