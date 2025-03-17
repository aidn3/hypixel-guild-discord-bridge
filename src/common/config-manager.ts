import fs from 'node:fs'

import type Application from '../application.js'

export class ConfigManager<T> {
  public data: T
  private readonly configFilePath: string

  public constructor(application: Application, filepath: string, data: T) {
    this.configFilePath = application.getConfigFilePath(filepath)
    this.data = data

    application.applicationIntegrity.addConfigPath(this.configFilePath)
  }

  public loadFromConfig(): void {
    if (!fs.existsSync(this.configFilePath)) return

    const fileData = fs.readFileSync(this.configFilePath, 'utf8')
    this.data = JSON.parse(fileData) as T
  }

  public saveConfig(): void {
    const dataRaw = JSON.stringify(this.data, undefined, 4)
    fs.writeFileSync(this.configFilePath, dataRaw, { encoding: 'utf8' })
  }
}
