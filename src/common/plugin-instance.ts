import type Application from '../application.js'
// eslint-disable-next-line import/no-restricted-paths
import type { PluginsManager } from '../instance/features/plugins-manager.js'

import { InstanceType } from './application-event.js'
import type { ChatCommandHandler, DiscordCommandHandler } from './commands.js'
import { Instance } from './instance.js'

export default abstract class PluginInstance extends Instance<InstanceType.Plugin> {
  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected

  private readonly pluginsManager: PluginsManager

  /**
   * Do NOT supersede the function and change its signature.
   * This function will be called as it is.
   * Modifying the signature can lead to crashes.
   */
  public constructor(application: Application, pluginsManager: PluginsManager, instanceName: string) {
    super(application, instanceName, InstanceType.Plugin)
    this.pluginsManager = pluginsManager
  }

  public abstract onReady(): Promise<void> | void

  public abstract pluginInfo(): PluginInfo

  public enabled(): boolean {
    return this.pluginsManager.getConfig().data.enabledPlugins.includes(this.instanceName)
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
