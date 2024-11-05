import fs from 'node:fs'

import { createCheckers } from 'ts-interface-checker'
import Yaml from 'yaml'

import ApplicationConfigTi from './application-config-ti.js'
import type { ApplicationConfig } from './application-config.js'

const ApplicationConfigChecker = createCheckers(ApplicationConfigTi)

export function loadApplicationConfig(filepath: fs.PathOrFileDescriptor): ApplicationConfig {
  const fileString = fs.readFileSync(filepath, 'utf8')
  const config = Yaml.parse(fileString) as unknown
  ApplicationConfigChecker.ApplicationConfig.check(config)
  return config as ApplicationConfig
}
