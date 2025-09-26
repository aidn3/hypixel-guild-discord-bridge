import assert from 'node:assert'
import fs from 'node:fs'

import deepcopy from 'deepcopy'
import Defaults from 'defaults'
import deepEqual from 'fast-deep-equal'
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
    assert.ok(!Array.isArray(data), 'configuration not allowed to be an array. Only Objects')
    this.data = data
    this.defaultConfig = deepcopy(data)

    application.applicationIntegrity.addConfigPath(this.configFilePath)

    setInterval(() => {
      this.saveIfDirty()
    }, ConfigManager.CheckDirtyEvery)

    application.addShutdownListener(() => {
      this.saveIfDirty()
    })

    this.reloadAndSaveIfChanged()
  }

  private reloadAndSaveIfChanged(): void {
    if (!fs.existsSync(this.configFilePath)) {
      this.save()
      return
    }

    const fileRawData = fs.readFileSync(this.configFilePath, 'utf8')
    const fileData = JSON.parse(fileRawData) as T

    interface DataContainer {
      data: T
    }

    const mergedData = Defaults(
      { data: fileData } satisfies DataContainer,
      { data: deepcopy(this.defaultConfig) } satisfies DataContainer
    )

    const readyToSave = JSON.stringify(
      this.removeWithoutDefaults(mergedData.data as Record<string, unknown>, this.defaultConfig),
      undefined,
      4
    )
    if (fileRawData !== readyToSave) {
      this.logger.debug(
        `Saved configuration file seems manually edited. Reformatting the file properly ${this.configFilePath}..`
      )
      fs.writeFileSync(this.configFilePath, readyToSave, { encoding: 'utf8' })
    }

    this.data = mergedData.data as T
  }

  public save(): void {
    this.logger.debug(`Saving configuration file for ${this.configFilePath}`)

    const objectToSave = this.removeWithoutDefaults(this.data as Record<string, unknown>, this.defaultConfig)
    const dataRaw = JSON.stringify(objectToSave, undefined, 4)
    fs.writeFileSync(this.configFilePath, dataRaw, { encoding: 'utf8' })
  }

  private removeWithoutDefaults(
    data: Record<string, unknown>,
    defaults: Record<string, unknown>
  ): Record<string, unknown> {
    const resultObject: Record<string, unknown> = {}

    for (const key of Object.keys(data)) {
      if (!(key in defaults)) {
        this.logger.warn(
          `Deleting key '${key}' since it is not defined in default configuration in ${this.configFilePath}`
        )
      }
    }

    for (const definedKey of Object.keys(defaults)) {
      if (!(definedKey in defaults)) {
        this.logger.warn(`Key '${definedKey}' not defined in current configuration for some reason??`)
        continue
      }

      if (!deepEqual(defaults[definedKey], data[definedKey])) {
        resultObject[definedKey] = data[definedKey]
      }
    }

    return resultObject
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
