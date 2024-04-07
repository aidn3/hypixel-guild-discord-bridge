import fs from 'node:fs'

import { createCheckers } from 'ts-interface-checker'
import YAML from 'yaml'

import ApplicationConfigTi from './application-config-ti.js'
import type { ApplicationConfig } from './application-config.js'

const applicationConfigChecker = createCheckers(ApplicationConfigTi)

export function loadApplicationConfig(filepath: fs.PathOrFileDescriptor): ApplicationConfig {
  const fileString = fs.readFileSync(filepath, 'utf8')
  const config = YAML.parse(fileString) as unknown
  applicationConfigChecker.ApplicationConfig.check(config)
  return config as ApplicationConfig
}
