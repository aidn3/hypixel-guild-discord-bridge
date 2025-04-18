import assert from 'node:assert'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import path from 'node:path'
import { setImmediate } from 'node:timers/promises'

import type Application from '../application.js'
import { InstanceType, type MinecraftSelfBroadcast } from '../common/application-event.js'
import type { MinecraftInstanceConfig } from '../common/application-internal-config.js'
import { Instance, InternalInstancePrefix } from '../common/instance.js'
// eslint-disable-next-line import/no-restricted-paths
import MinecraftInstance from '../instance/minecraft/minecraft-instance.js'

export class MinecraftManager extends Instance<void, InstanceType.Util> {
  private readonly instances = new Set<MinecraftInstance>()
  private readonly minecraftBots = new Map<string, MinecraftSelfBroadcast>()

  private readonly sessionDirectory

  constructor(application: Application) {
    super(application, InternalInstancePrefix + 'MinecraftManager', InstanceType.Util)

    const sessionDirectoryName = 'minecraft-sessions'
    this.sessionDirectory = this.application.getConfigFilePath(sessionDirectoryName)
    fs.mkdirSync(this.sessionDirectory, { recursive: true })
    this.application.applicationIntegrity.addConfigPath(sessionDirectoryName)

    this.application.on('minecraftSelfBroadcast', (event) => {
      this.minecraftBots.set(event.instanceName, event)
    })
  }

  public isMinecraftBot(username: string): boolean {
    for (const value of this.minecraftBots.values()) {
      if (username === value.username) return true
    }

    return false
  }

  public getMinecraftBots(): MinecraftSelfBroadcast[] {
    return Array.from(this.minecraftBots, ([, value]) => value)
  }

  public loadInstances(): void {
    const config = this.application.applicationInternalConfig.data.minecraft
    for (const instanceConfig of config.instances) {
      this.instances.add(
        new MinecraftInstance(this.application, instanceConfig.name, instanceConfig, this.sessionDirectory)
      )
    }
  }

  public addAndStart(config: MinecraftInstanceConfig): void {
    if (this.getAllInstances().some((instance) => instance.instanceName.toLowerCase() === config.name.toLowerCase())) {
      throw new Error('Minecraft instance name already exists')
    }

    const instance = new MinecraftInstance(this.application, config.name, config, this.sessionDirectory)
    this.instances.add(instance)

    instance.connect()
  }

  public async removeInstance(instanceName: string): Promise<RemoveResultEntry> {
    this.logger.debug(`Removing minecraft instance '${instanceName}'`)
    const result: RemoveResultEntry = {
      name: instanceName,
      instanceRemoved: 0,
      deletedConfig: 0,
      deletedSessionFiles: 0
    }

    const config = this.application.applicationInternalConfig
    const instances = this.getAllInstances().filter(
      (instance) => instance.instanceName.toLowerCase() === instanceName.toLowerCase()
    )

    // remove cached files
    const potentialNames = config.data.minecraft.instances
      .filter((instance) => instance.name.toLowerCase() === instanceName.toLowerCase())
      .map((instance) => instance.name)
    potentialNames.push(instanceName, ...instances.map((instance) => instance.instanceName))
    result.deletedSessionFiles = this.deleteSessionFiles(potentialNames)

    // remove related configs
    const newConfig = config.data.minecraft.instances.filter(
      (instanceConfig) => instanceConfig.name.toLowerCase() !== instanceName.toLowerCase()
    )
    result.deletedConfig = config.data.minecraft.instances.length - newConfig.length
    config.data.minecraft.instances = newConfig
    config.saveConfig()

    // remove initialed instances
    for (const instance of instances) {
      instance.disconnect()
    }
    // wait till next cycle to let the clients close properly
    // and send their remaining events before deleting them from the registry
    await setImmediate()
    for (const instance of instances) {
      assert(this.instances.delete(instance))
      this.minecraftBots.delete(instance.instanceName)
    }
    result.instanceRemoved += instances.length

    return result
  }

  private deleteSessionFiles(instanceNames: string[]): number {
    let deletedFiles = 0

    const allFiles = fs.readdirSync(this.sessionDirectory)
    for (const instanceName of new Set<string>(instanceNames).values()) {
      const hash = crypto.createHash('sha1').update(instanceName, 'binary').digest('hex').slice(0, 6)
      const sessionFiles: string[] = allFiles.filter((file) => file.startsWith(hash))
      deletedFiles += sessionFiles.length
      if (sessionFiles.length === 0) continue

      this.logger.debug(`Deleting relevant session files for name=${instanceName},hash=${hash}`)
      for (const sessionFile of sessionFiles) {
        const fullPath = path.resolve(this.sessionDirectory, sessionFile)
        this.logger.trace(`Deleting session file: ${fullPath}`)
        fs.rmSync(fullPath)
      }
    }

    return deletedFiles
  }

  public getAllInstances(): MinecraftInstance[] {
    return [...this.instances.values()]
  }
}

interface RemoveResultEntry {
  instanceRemoved: number
  deletedSessionFiles: number
  deletedConfig: number
  name: string
}
