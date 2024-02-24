import fs from 'node:fs'
import YAML from 'yaml'
import { createCheckers } from 'ts-interface-checker'
import type { ApplicationConfig } from './application-config'
import ApplicationConfigTi from './application-config-ti'

const applicationConfigChecker = createCheckers(ApplicationConfigTi)

export function loadApplicationConfig(filepath: fs.PathOrFileDescriptor): ApplicationConfig {
  const fileString = fs.readFileSync(filepath, 'utf8')
  const config = YAML.parse(fileString) as unknown
  applicationConfigChecker.ApplicationConfig.check(config)
  return config as ApplicationConfig
}
