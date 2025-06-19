import fs from 'node:fs'

import { default as deepcopy } from 'deepcopy'
import Defaults from 'defaults'
import { default as deepEqual } from 'fast-deep-equal'
import type { Logger } from 'log4js'

import type Application from '../application.js'

export class ConfigManager<T extends object> {
  private static readonly CheckDirtyEvery = 30 * 1000

  public data: T

  private dirty = false
  private readonly defaultConfig: Readonly<T>
  private readonly configFilePath: string
  private readonly logger: Logger

  public constructor(application: Application, logger: Logger, filepath: string, data: T) {
    this.logger = logger
    this.configFilePath = filepath
    this.data = data
    this.defaultConfig = deepcopy(data)

    application.applicationIntegrity.addConfigPath(this.configFilePath)

    setInterval(() => {
      this.saveIfDirty()
    }, ConfigManager.CheckDirtyEvery)

    application.addShutdownListener(() => {
      this.saveIfDirty()
    })

    this.reload()
    this.save() // to write any new default configs into the file
  }

  private reload(): void {
    if (!fs.existsSync(this.configFilePath)) return

    const fileRawData = fs.readFileSync(this.configFilePath, 'utf8')
    const fileData = JSON.parse(fileRawData) as T

    interface DataContainer {
      data: T
    }

    const mergedData = Defaults(
      { data: fileData } satisfies DataContainer,
      { data: deepcopy(this.defaultConfig) } satisfies DataContainer
    )

    this.data = mergedData.data as T
  }

  public save(): void {
    this.logger.debug(`Saving configuration file for ${this.configFilePath}`)

    const data = this.data as Record<string, unknown>
    const defaultData = this.defaultConfig as Record<string, unknown>
    const objectToSave: Record<string, unknown> = {}

    for (const key of Object.keys(this.data)) {
      if (!(key in this.defaultConfig)) {
        this.logger.warn(
          `Deleting key '${key}' since it is not defined in default configuration in ${this.configFilePath}`
        )
      }
    }

    for (const definedKey of Object.keys(this.defaultConfig)) {
      if (!(definedKey in this.data)) {
        this.logger.warn(`Key '${definedKey}' not defined in current configuration for some reason??`)
        continue
      }

      if (!deepEqual(defaultData[definedKey], data[definedKey])) {
        objectToSave[definedKey] = data[definedKey]
      }
    }

    const dataRaw = JSON.stringify(objectToSave, undefined, 4)
    fs.writeFileSync(this.configFilePath, dataRaw, { encoding: 'utf8' })
  }

  /**
   * Mark {@link #data} changed. So they are eligible for auto save routine.
   */
  public markDirty(): void {
    if (!this.dirty) {
      this.logger.debug(`Marked configuration as dirty for later save: ${this.configFilePath}`)
    }
    this.dirty = true
  }

  private saveIfDirty(): void {
    if (this.dirty) {
      this.save()
      this.dirty = false
    }
  }
}
