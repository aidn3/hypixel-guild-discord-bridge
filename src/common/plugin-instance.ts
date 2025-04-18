import type Application from '../application.js'

import { InstanceType } from './application-event.js'
import type { ChatCommandHandler, DiscordCommandHandler } from './commands.js'
import { Instance } from './instance.js'

export default abstract class PluginInstance extends Instance<void, InstanceType.Plugin> {
  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  /**
   * Do NOT supersede the function and change its signature.
   * This function will be called as it is.
   * Modifying the signature can lead to crashes.
   */
  public constructor(application: Application, instanceName: string) {
    super(application, instanceName, InstanceType.Plugin)
  }

  public abstract onReady(): Promise<void> | void

  public abstract pluginInfo(): PluginInfo

  public enabled(): boolean {
    return this.application.applicationInternalConfig.data.plugin.enabledPlugins.includes(this.instanceName)
  }

  protected addChatCommand(command: ChatCommandHandler): void {
    this.application.commandsInstance.commands.push(command)
  }

  protected addDiscordCommand(command: DiscordCommandHandler): void {
    this.application.discordInstance.commandsManager.commands.set(command.getCommandBuilder().name, command)
  }
}

export interface PluginInfo {
  description: string
  conflicts?: string[]
}
