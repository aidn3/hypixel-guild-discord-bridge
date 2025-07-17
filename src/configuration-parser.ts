import fs from 'node:fs'

import { createCheckers } from 'ts-interface-checker'
import Yaml from 'yaml'

import ApplicationConfigTi from './application-config-ti.js'
import type { ApplicationConfig } from './application-config.js'
import { ApplicationConfigVersion } from './application-config.js'

const ApplicationConfigChecker = createCheckers(ApplicationConfigTi)

export function loadApplicationConfig(filepath: fs.PathOrFileDescriptor): ApplicationConfig {
  const fileString = fs.readFileSync(filepath, 'utf8')
  const config = Yaml.parse(fileString) as unknown

  // @ts-expect-error the validity of the object has not been checked yet till at last
  if (config.version === undefined || typeof config.version !== 'number' || config.version < ApplicationConfigVersion) {
    throw new Error(
      `Configuration file "${filepath.toString()}" is too old. ` +
        `Check config_example.yaml for the new configuration format. ` +
        `Check MIGRATION.md for further information on how to migrate the configuration file.`
    )
  }
  assertsConfigValidity(config)

  if ('plugins' in config) {
    throw new Error(
      `Detected 'plugins' section in configration file ${filepath.toString()}. ` +
        'Plugins have been migrated outside the configuration file. ' +
        'Check docs/PLUGINS.md and docs/MIGRATION.md for further information on how to migrate.'
    )
  }

  return config
}

function assertsConfigValidity(value: unknown): asserts value is ApplicationConfig {
  ApplicationConfigChecker.ApplicationConfig.check(value)
}
