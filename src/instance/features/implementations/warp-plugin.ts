import type Application from '../../../application.js'
import {
  InstanceType,
  type MinecraftRawChatEvent,
  MinecraftSendChatPriority
} from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import type EventHelper from '../../../common/event-helper.js'
import type { PluginInfo } from '../../../common/plugin-instance.js'
import PluginInstance from '../../../common/plugin-instance.js'
// eslint-disable-next-line import/no-restricted-paths
// eslint-disable-next-line import/no-restricted-paths
import { sleep } from '../../../util/shared-util.js'
import type MinecraftInstance from '../../minecraft/minecraft-instance.js'
import type { MinecraftManager } from '../../minecraft/minecraft-manager.js'
import { OfficialPlugins } from '../common/plugins-config.js'
import type { PluginsManager } from '../plugins-manager.js'

export default class WarpPlugin extends PluginInstance {
  private disableLimboTrapping = false

  constructor(application: Application, pluginsManager: PluginsManager) {
    super(application, pluginsManager, OfficialPlugins.Warp)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Add !warp command to warp players out of a lobby', conflicts: [OfficialPlugins.Limbo] }
  }

  onReady(): Promise<void> | void {
    this.addChatCommand(new WarpCommand(this))

    this.application.on('instanceStatus', (event) => {
      if (event.status === Status.Connected && event.instanceType === InstanceType.Minecraft) {
        const localInstance = this.application.minecraftManager
          .getAllInstances()
          .find((instance) => instance.instanceName === event.instanceName)

        if (localInstance != undefined) {
          if (!this.disableLimboTrapping) {
            void this.limbo(localInstance).catch(this.errorHandler.promiseCatch('handling /limbo command'))
          }

          // "login" packet is also first spawn packet containing world metadata
          // @ts-expect-error client is private variable
          localInstance.clientSession?.client.on('login', async () => {
            if (!this.disableLimboTrapping) await this.limbo(localInstance)
          })
          // @ts-expect-error client is private variable
          localInstance.clientSession?.client.on('respawn', async () => {
            if (!this.disableLimboTrapping) await this.limbo(localInstance)
          })
        }
      }
    })
  }

  private async limbo(clientInstance: MinecraftInstance): Promise<void> {
    if (!this.enabled()) return

    this.logger.debug(`Spawn event triggered on ${clientInstance.instanceName}. sending to limbo...`)
    await clientInstance.send('/limbo', MinecraftSendChatPriority.Default, undefined)
  }

  async warpPlayer(
    app: Application,
    eventHelper: EventHelper<InstanceType>,
    context: ChatCommandContext,
    minecraftInstanceName: string,
    username: string
  ): Promise<string> {
    this.disableLimboTrapping = true
    context.sendFeedback(`Preparing to warp ${username}`)

    // exit limbo and go to main lobby. Can't warp from limbo
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: '/lobby'
    })

    // Go to Skyblock first before warping.
    // Person can rejoin if warped to the main lobby
    await sleep(2000)
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: '/skyblock'
    })

    // ensure the account is in the hub and not on private island
    // to prevent being banned for "profile boosting"
    await sleep(12_000) // need higher cooldown to change between lobbies
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: '/hub'
    })

    await sleep(2000)

    const errorMessage = await awaitPartyStatus(app, eventHelper, context, minecraftInstanceName, username)
    if (errorMessage != undefined) {
      this.disableLimboTrapping = false
      this.application.emit('minecraftSend', {
        ...this.eventHelper.fillBaseEvent(),
        targetInstanceName: [minecraftInstanceName],
        priority: MinecraftSendChatPriority.High,
        command: '/limbo'
      })

      this.application.emit('minecraftSend', {
        ...this.eventHelper.fillBaseEvent(),
        targetInstanceName: [minecraftInstanceName],
        priority: MinecraftSendChatPriority.High,
        command: '/party disband'
      })
      this.application.emit('minecraftSend', {
        ...this.eventHelper.fillBaseEvent(),
        targetInstanceName: [minecraftInstanceName],
        priority: MinecraftSendChatPriority.High,
        command: '/party leave'
      })

      return errorMessage
    }

    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.Instant,
      command: '/party warp'
    })
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: `/pc Blame the gods on your luck`
    })

    await sleep(2000)
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: '/party disband'
    })
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: '/party leave'
    })

    this.disableLimboTrapping = false
    this.application.emit('minecraftSend', {
      ...this.eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: '/limbo'
    })

    return 'Player has been warped out!'
  }
}

/**
 * Send party invite and await response.
 * The return is only a failure message. undefined means the invite was successful.
 *
 * @param app the application instance
 * @param eventHelper used to send commands with context for other instances
 * @param context chat command that executed the warp command
 * @param minecraftInstanceName the target minecraft instance to use to execute commands
 * @param username the target to party
 */
async function awaitPartyStatus(
  app: Application,
  eventHelper: EventHelper<InstanceType>,
  context: ChatCommandContext,
  minecraftInstanceName: string,
  username: string
): Promise<string | undefined> {
  return await new Promise((resolve) => {
    let errorMessage: string | undefined

    const timeoutId = setTimeout(() => {
      app.removeListener('minecraftChat', chatListener)
      resolve("Player didn't accept the invite.")
    }, 30_000)

    const chatListener = function (event: MinecraftRawChatEvent): void {
      if (event.instanceName !== minecraftInstanceName) return
      let doneCollecting = false

      if (event.message.startsWith("You cannot invite that player since they're not online.")) {
        errorMessage = 'Player not online?'
        doneCollecting = true
      } else if (event.message.startsWith('You cannot invite that player.')) {
        errorMessage = 'Player has party invites disabled.'
        doneCollecting = true
      } else if (/^The party invite to (?:\[[+A-Z]{3,10}] )?(\w{3,32}) has expired/.exec(event.message) != undefined) {
        errorMessage = "Player didn't accept the invite."
        doneCollecting = true
      } else if (/^(?:\[[+A-Z]{3,10}] )?(\w{3,32}) joined the party/.exec(event.message) != undefined) {
        errorMessage = undefined
        doneCollecting = true
      }

      if (doneCollecting) {
        clearTimeout(timeoutId)
        app.removeListener('minecraftChat', chatListener)
        resolve(errorMessage)
      }
    }

    context.sendFeedback(`Sending party invite to warp ${username}`)
    app.on('minecraftChat', chatListener)
    app.emit('minecraftSend', {
      ...eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.Instant,
      command: `/party invite ${username}`
    })
    app.emit('minecraftSend', {
      ...eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.Instant,
      command: `/party disband`
    })
    app.emit('minecraftSend', {
      ...eventHelper.fillBaseEvent(),
      targetInstanceName: [minecraftInstanceName],
      priority: MinecraftSendChatPriority.High,
      command: `/party invite ${username}`
    })
  })
}

class WarpCommand extends ChatCommandHandler {
  private static readonly CommandCoolDown = 60_000
  private lastCommandExecutionAt = 0
  private readonly warpPlugin: WarpPlugin

  constructor(warpPlugin: WarpPlugin) {
    super({
      name: 'Warp',
      triggers: ['warp'],
      description: 'Warp a player out of a lobby',
      example: `warp Steve`
    })

    this.warpPlugin = warpPlugin
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (!this.warpPlugin.enabled()) {
      return 'Warp plugin is disabled.'
    }

    if (context.args.length === 0) {
      return this.getExample(context.commandPrefix)
    }

    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + WarpCommand.CommandCoolDown > currentTime) {
      return `Can use command again in ${Math.floor((this.lastCommandExecutionAt + WarpCommand.CommandCoolDown - currentTime) / 1000)} seconds.`
    }

    const username = context.args[0]
    const minecraftInstanceName =
      context.instanceType === InstanceType.Minecraft
        ? context.instanceName
        : this.getActiveMinecraftInstanceName(context.app.minecraftManager)
    if (minecraftInstanceName === undefined) {
      return `No active connected Minecraft account exists to use`
    }

    this.lastCommandExecutionAt = currentTime

    return await this.warpPlugin.warpPlayer(context.app, context.eventHelper, context, minecraftInstanceName, username)
  }

  private getActiveMinecraftInstanceName(minecraftManager: MinecraftManager): string | undefined {
    return minecraftManager.getAllInstances().find((instance) => instance.currentStatus() === Status.Connected)
      ?.instanceName
  }
}
