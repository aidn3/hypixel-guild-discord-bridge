import assert from 'node:assert'

import type Application from '../../application.js'
import { type MinecraftSelfBroadcast } from '../../common/application-event.js'
import { Instance } from '../../common/instance.js'
import type { MinecraftInstanceConfig } from '../../core/minecraft/sessions-manager'

import MinecraftInstance from './minecraft-instance.js'
import { Sanitizer } from './utility/sanitizer.js'

export class MinecraftManager extends Instance {
  public sanitizer: Sanitizer

  private readonly instances = new Set<MinecraftInstance>()
  private readonly minecraftBots = new WeakMap<MinecraftInstance, MinecraftSelfBroadcast>()

  constructor(application: Application) {
    super(application, 'MinecraftManager')
    this.sanitizer = new Sanitizer(application)

    this.application.on('minecraftSelfBroadcast', (event) => {
      this.minecraftBots.set(event.instance, event)
    })
  }

  public isMinecraftBot(username: string): boolean {
    for (const instance of this.instances) {
      const entry = this.minecraftBots.get(instance)
      if (entry === undefined) continue

      if (username.toLowerCase() === entry.username.toLowerCase()) return true
      if (username.toLowerCase() === entry.uuid.toLowerCase()) return true
    }

    return false
  }

  public getMinecraftBots(): MinecraftSelfBroadcast[] {
    return this.instances
      .values()
      .toArray()
      .map((instance) => this.minecraftBots.get(instance))
      .filter((entry) => entry !== undefined)
  }

  public loadInstances(): void {
    const instances = this.application.core.minecraftSessions.getAllInstances()
    for (const instanceConfig of instances) {
      this.instances.add(new MinecraftInstance(this.application, instanceConfig))
    }
  }

  public async initiateAndStart(config: MinecraftInstanceConfig): Promise<MinecraftInstance> {
    const instance = new MinecraftInstance(this.application, config)
    this.instances.add(instance)

    try {
      await instance.connect()
      return instance
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
      (instance) => instance.getConfigName().toLowerCase() === instanceName.toLowerCase()
    )
    for (const instance of instances) {
      await instance.disconnect()
    }

    for (const instance of instances) {
      assert.ok(this.instances.delete(instance))
      this.minecraftBots.delete(instance)
      instance.destroy()
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
