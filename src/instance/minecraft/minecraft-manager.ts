import assert from 'node:assert'

import type Application from '../../application.js'
import { InstanceType, type MinecraftSelfBroadcast } from '../../common/application-event.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import type { MinecraftInstanceConfig } from '../../core/minecraft/sessions-manager'

import MinecraftInstance from './minecraft-instance.js'
import { Sanitizer } from './utility/sanitizer.js'

export class MinecraftManager extends Instance<InstanceType.Utility> {
  public sanitizer: Sanitizer

  private readonly instances = new Set<MinecraftInstance>()
  private readonly minecraftBots = new Map<string, MinecraftSelfBroadcast>()

  constructor(application: Application) {
    super(application, InternalInstancePrefix + 'MinecraftManager', InstanceType.Utility)
    this.sanitizer = new Sanitizer(application)

    this.application.on('minecraftSelfBroadcast', (event) => {
      this.minecraftBots.set(event.instanceName, event)
    })
  }

  public isMinecraftBot(username: string): boolean {
    for (const value of this.minecraftBots.values()) {
      if (username.toLowerCase() === value.username.toLowerCase()) return true
      if (username.toLowerCase() === value.uuid.toLowerCase()) return true
    }

    return false
  }

  public getMinecraftBots(): MinecraftSelfBroadcast[] {
    return Array.from(this.minecraftBots, ([, value]) => value)
  }

  public loadInstances(): void {
    const instances = this.application.core.minecraftSessions.getAllInstances()
    for (const instanceConfig of instances) {
      this.instances.add(new MinecraftInstance(this.application, instanceConfig.name, instanceConfig))
    }
  }

  public async addAndStart(config: MinecraftInstanceConfig): Promise<void> {
    if (this.getAllInstances().some((instance) => instance.instanceName.toLowerCase() === config.name.toLowerCase())) {
      throw new Error('Minecraft instance name already exists')
    }

    const instance = new MinecraftInstance(this.application, config.name, config)
    this.instances.add(instance)

    try {
      instance.connect()
    } catch (error: unknown) {
      await instance.disconnect().catch(() => undefined) // it might throw an error if connecting is throwing one already
      this.instances.delete(instance)
      throw error
    }
  }

  public async removeInstance(instanceName: string): Promise<RemoveResultEntry> {
    this.logger.debug(`Removing minecraft instance '${instanceName}'`)
    const result: RemoveResultEntry = {
      name: instanceName,
      instanceRemoved: 0,
      deletedConfig: 0,
      deletedSessionFiles: 0
    }

    const config = this.application.core.minecraftSessions
    result.deletedSessionFiles = config.deleteSession(instanceName)
    result.deletedConfig = config.deleteInstance(instanceName)

    const instances = this.getAllInstances().filter(
      (instance) => instance.instanceName.toLowerCase() === instanceName.toLowerCase()
    )
    for (const instance of instances) {
      await instance.disconnect()
    }

    for (const instance of instances) {
      assert.ok(this.instances.delete(instance))
      this.minecraftBots.delete(instance.instanceName)
    }
    result.instanceRemoved += instances.length

    return result
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
