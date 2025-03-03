import type Application from '../application.js'

import { InstanceType } from './application-event.js'
import type { ChatCommandHandler, DiscordCommandHandler } from './commands.js'
import { Instance } from './instance.js'

export type AddChatCommand = (command: ChatCommandHandler) => void
export type AddDiscordCommand = (command: DiscordCommandHandler) => void

export default abstract class PluginInstance extends Instance<void, InstanceType.Plugin> {
  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  /**
   * Do NOT supersede the function and change its signature.
   * This function will be called as it is.
   * Modifying the signature can lead to crashes.
   */
  public constructor(
    application: Application,
    instanceName: string,
    protected readonly pluginPath: string,
    protected readonly addChatCommand: AddChatCommand | undefined,
    protected readonly addDiscordCommand: AddDiscordCommand | undefined
  ) {
    super(application, instanceName, InstanceType.Plugin)
  }

  public abstract onReady(): Promise<void> | void
}
