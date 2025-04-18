import fs from 'node:fs'

import Defaults from 'defaults'

import type Application from '../application.js'

export class ConfigManager<T> {
  public data: T
  private readonly defaultConfig: T
  private readonly configFilePath: string

  public constructor(application: Application, filepath: string, data: T) {
    this.configFilePath = application.getConfigFilePath(filepath)
    this.data = data
    this.defaultConfig = Defaults({ data }, undefined).data // deep clone

    application.applicationIntegrity.addConfigPath(this.configFilePath)
  }

  public loadFromConfig(): void {
    if (!fs.existsSync(this.configFilePath)) return

    const fileRawData = fs.readFileSync(this.configFilePath, 'utf8')
    const fileData = JSON.parse(fileRawData) as T
    interface DataContainer {
      data: T
    }
    const mergedData = Defaults(
      { data: fileData } satisfies DataContainer,
      { data: this.defaultConfig } satisfies DataContainer
    )

    this.data = mergedData.data as T
  }

  public saveConfig(): void {
    const dataRaw = JSON.stringify(this.data, undefined, 4)
    fs.writeFileSync(this.configFilePath, dataRaw, { encoding: 'utf8' })
  }
}
