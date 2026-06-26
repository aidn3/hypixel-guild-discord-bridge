import type Application from '../../../application.js'
import {
  ChannelType,
  Color,
  type MinecraftRawChatEvent,
  MinecraftSendChatPriority,
  Platform
} from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown } from '../../../common/commands.js'
import { ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import Duration from '../../../utility/duration'
import { sleep } from '../../../utility/shared-utility'
import { Timeout } from '../../../utility/timeout.js'
// eslint-disable-next-line import/no-restricted-paths
import type MinecraftInstance from '../../minecraft/minecraft-instance.js'
// eslint-disable-next-line import/no-restricted-paths
import type { MinecraftManager } from '../../minecraft/minecraft-manager'

export default class Warp extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['warp', 'warpout'],
      description: 'Warp a player out of a lobby',
      example: `warp Steve`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.Community, duration: Duration.minutes(1) }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.args.length === 0) {
      context.resetCooldown()
      return this.getExample(context.commandPrefix)
    }

    const username = context.args[0]
    const instance = this.getActiveMinecraftInstanceName(
      context.app.minecraftManager,
      context.message.platform === Platform.Minecraft ? context.message.instance : undefined
    )
    if (instance === undefined) {
      return `No active connected Minecraft account exists to use`
    }

    return await this.warpPlayer(instance, context, username)
  }

  private getActiveMinecraftInstanceName(
    minecraftManager: MinecraftManager,
    preferredInstance: MinecraftInstance | undefined
  ): MinecraftInstance | undefined {
    if (preferredInstance !== undefined) return preferredInstance

    return minecraftManager.getAllInstances().find((instance) => instance.currentStatus() === Status.Connected)
  }

  async warpPlayer(instance: MinecraftInstance, context: ChatCommandContext, username: string): Promise<string> {
    await context.sendFeedback(`Preparing to warp ${username}`)
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
    // Second needed to warp out of mini-games
    await instance.send('/party warp', MinecraftSendChatPriority.High, undefined)

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

    const chatListener = async (event: MinecraftRawChatEvent) => {
      if (event.instance !== instance) return

      if (event.message.startsWith("You cannot invite that player since they're not online.")) {
        timeout.resolve('Player not online?')
      } else if (event.message.startsWith("Couldn't find a player with that name")) {
        timeout.resolve("Couldn't find a player with that name!")
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

        await application.emit('broadcast', {
          ...context.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Officer],
          color: Color.Bad,

          user: undefined,
          message:
            `Accidentally Joined ${someoneParty[1]}'s party!` +
            ' The offending person might be purposely doing it to abuse the service.'
        })
      }
    }

    await context.sendFeedback(`Sending party invite to warp ${username}`)

    application.on('minecraftChat', chatListener)
    // Inviting multiple people prevents the bot from accidentally joining the target party
    // if they sent a party invite to the bot
    // this is an exploit fix
    await instance.send(`/party invite ${username} ${username}`, MinecraftSendChatPriority.High, undefined)

    const result = await timeout.wait()
    application.off('minecraftChat', chatListener)

    return result
  }
}
