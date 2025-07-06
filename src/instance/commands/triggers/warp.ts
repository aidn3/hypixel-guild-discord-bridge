import type Application from '../../../application.js'
import {
  ChannelType,
  Color,
  InstanceType,
  type MinecraftRawChatEvent,
  MinecraftSendChatPriority
} from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { sleep } from '../../../util/shared-util.js'
import { Timeout } from '../../../util/timeout.js'
// eslint-disable-next-line import/no-restricted-paths
import type MinecraftInstance from '../../minecraft/minecraft-instance.js'
// eslint-disable-next-line import/no-restricted-paths
import type { MinecraftManager } from '../../minecraft/minecraft-manager.js'

export default class Warp extends ChatCommandHandler {
  private static readonly CommandCoolDown = 60_000
  private lastCommandExecutionAt = 0

  constructor() {
    super({
      triggers: ['warp'],
      description: 'Warp a player out of a lobby',
      example: `warp Steve`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.args.length === 0) {
      return this.getExample(context.commandPrefix)
    }

    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + Warp.CommandCoolDown > currentTime) {
      return `Can use command again in ${Math.floor((this.lastCommandExecutionAt + Warp.CommandCoolDown - currentTime) / 1000)} seconds.`
    }

    const username = context.args[0]
    const instance = this.getActiveMinecraftInstanceName(
      context.app.minecraftManager,
      context.instanceType === InstanceType.Minecraft ? context.instanceName : undefined
    )
    if (instance === undefined) {
      return `No active connected Minecraft account exists to use`
    }

    this.lastCommandExecutionAt = currentTime

    return await this.warpPlayer(instance, context, username)
  }

  private getActiveMinecraftInstanceName(
    minecraftManager: MinecraftManager,
    preferredInstanceName: string | undefined
  ): MinecraftInstance | undefined {
    const availableInstances = minecraftManager
      .getAllInstances()
      .filter((instance) => instance.currentStatus() === Status.Connected)

    let result: MinecraftInstance | undefined
    if (preferredInstanceName !== undefined) result = availableInstances.find(Boolean)
    if (result === undefined && availableInstances.length > 0) result = availableInstances[0]

    return result
  }

  async warpPlayer(instance: MinecraftInstance, context: ChatCommandContext, username: string): Promise<string> {
    context.sendFeedback(`Preparing to warp ${username}`)
    const lock = await instance.acquireLimbo()

    // leave any existing party
    await instance.send('/party leave', MinecraftSendChatPriority.High, undefined)

    // exit limbo and go to main lobby. Can't warp from limbo
    await instance.send('/lobby', MinecraftSendChatPriority.High, undefined)

    // Go to Skyblock first before warping.
    // Person can rejoin if warped to the main lobby
    await sleep(2000)
    await instance.send('/skyblock', MinecraftSendChatPriority.High, undefined)

    // ensure the account is in the hub and not on private island
    // to prevent being banned for "profile boosting"
    await sleep(12_000) // need higher cooldown to change between lobbies
    await instance.send('/hub', MinecraftSendChatPriority.High, undefined)

    await sleep(2000)

    const errorMessage = await this.awaitPartyStatus(context.app, instance, context, username)
    if (errorMessage != undefined) {
      await instance.send('/party disband', MinecraftSendChatPriority.High, undefined)
      await instance.send('/party leave', MinecraftSendChatPriority.High, undefined)

      lock.resolve() // free lock

      return errorMessage
    }

    await instance.send('/party warp', MinecraftSendChatPriority.High, undefined)
    await sleep(1000)
    await instance.send(`/pc Blame the gods on your luck`, MinecraftSendChatPriority.High, undefined)

    await sleep(2000)
    await instance.send('/party disband', MinecraftSendChatPriority.High, undefined)
    await instance.send('/party leave', MinecraftSendChatPriority.High, undefined)

    lock.resolve() // free lock

    return 'Player has been warped out!'
  }

  async awaitPartyStatus(
    application: Application,
    instance: MinecraftInstance,
    context: ChatCommandContext,
    username: string
  ): Promise<string | undefined> {
    const timeout = new Timeout<string | undefined>(30_000, "Player didn't accept the invite.")

    const chatListener = (event: MinecraftRawChatEvent) => {
      if (event.instanceName !== instance.instanceName) return

      if (event.message.startsWith("You cannot invite that player since they're not online.")) {
        timeout.resolve('Player not online?')
      } else if (event.message.startsWith('You cannot invite that player.')) {
        timeout.resolve('Player has party invites disabled.')
      } else if (/^The party invite to (?:\[[+A-Z]{3,10}] )?(\w{3,32}) has expired/.exec(event.message) != undefined) {
        timeout.resolve("Player didn't accept the invite.")
      } else if (/^(?:\[[+A-Z]{3,10}] )?(\w{3,32}) joined the party/.exec(event.message) != undefined) {
        timeout.resolve(undefined)
      }

      const someoneParty = /^You have joined (?:\[[+A-Z]{3,10}] )?(\w{3,32})'s party!/g.exec(event.message)
      if (someoneParty) {
        timeout.resolve(`Accidentally Joined ${someoneParty[1]}'s party!`)

        application.emit('broadcast', {
          ...context.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Officer],
          color: Color.Bad,

          username: someoneParty[1],
          message:
            `Accidentally Joined ${someoneParty[1]}'s party!` +
            ' The offending person might be purposely doing it to abuse the service.'
        })
      }
    }

    context.sendFeedback(`Sending party invite to warp ${username}`)

    await instance.send(`/party invite ${username}`, MinecraftSendChatPriority.High, undefined)
    await instance.send(`/party disband`, MinecraftSendChatPriority.High, undefined)

    application.on('minecraftChat', chatListener)
    await instance.send(`/party invite ${username}`, MinecraftSendChatPriority.High, undefined)

    const result = await timeout.wait()
    application.removeListener('minecraftChat', chatListener)

    return result
  }
}
