import type Application from './application.js'
import type { InstanceType, MinecraftSelfBroadcast } from './common/application-event.js'

export default class ClusterHelper {
  private readonly app: Application
  private readonly minecraftBots = new Map<string, MinecraftSelfBroadcast>()
  private readonly instancesNames = new Map<InstanceType, Set<string>>()

  constructor(app: Application) {
    this.app = app

    this.app.on('minecraftSelfBroadcast', (event) => this.minecraftBots.set(event.instanceName, event))
    this.app.on('instance', (event) => {
      this.instanceBroadcast(event.instanceName, event.instanceType)
    })
    this.app.on('selfBroadcast', (event) => {
      this.instanceBroadcast(event.instanceName, event.instanceType)
    })
  }

  sendCommandToMinecraft(instanceName: string, command: string): void {
    this.app.emit('minecraftSend', {
      localEvent: true,
      targetInstanceName: instanceName,
      command
    })
  }

  sendCommandToAllMinecraft(command: string): void {
    this.app.emit('minecraftSend', {
      localEvent: true,
      targetInstanceName: undefined,
      command
    })
  }

  getInstancesNames(location: InstanceType): string[] {
    const instanceNames = this.instancesNames.get(location)
    if (instanceNames == undefined) return []

    const result: string[] = []
    for (const instanceName of instanceNames) {
      result.push(instanceName)
    }
    return result
  }

  isMinecraftBot(username: string): boolean {
    for (const value of this.minecraftBots.values()) {
      if (username === value.username) return true
    }

    return false
  }

  getMinecraftBots(): MinecraftSelfBroadcast[] {
    return Array.from(this.minecraftBots, ([, value]) => value)
  }

  private instanceBroadcast(instanceName: string, location: InstanceType): void {
    let collection = this.instancesNames.get(location)
    if (collection == undefined) {
      collection = new Set<string>()
      this.instancesNames.set(location, collection)
    }
    collection.add(instanceName)
  }
}
