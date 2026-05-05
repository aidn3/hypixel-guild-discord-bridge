import { ChannelType, InstanceType, Permission, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { usernameNotExists } from '../common/utility'

export default class Airstrike extends ChatCommandHandler {
  private static readonly MuteDuration = Duration.minutes(1)

  constructor() {
    super({
      triggers: ['airstrike', 'as'],
      description: 'Mute a specific person to annoy them',
      example: `airstrike %s`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [InstanceType.Minecraft], sources: [ChannelType.Public] }
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.Community, duration: Duration.hours(1) }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] as string | undefined
    if (givenUsername === undefined) {
      context.resetCooldown()
      return `${context.username}, you need to specify someone!`
    }

    if (context.app.minecraftManager.isMinecraftBot(givenUsername)) {
      context.resetCooldown()
      return `${context.username}, You can't airstrike the bot itself!`
    }
    if (givenUsername.toLowerCase() === 'everyone') {
      context.resetCooldown()
      return `${context.username}, You can't airstrike everyone!`
    }

    const mojangProfile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (mojangProfile == undefined) return usernameNotExists(context, givenUsername)
    const targetUser = await context.app.core.initializeMinecraftUser(mojangProfile, {})
    if ((await targetUser.permission()) >= Permission.Helper || (await targetUser.immune())) {
      context.resetCooldown()
      return `No way doing an airstrike on ${mojangProfile.name}!`
    }

    await targetUser.mute(
      context.eventHelper.fillBaseEvent(),
      PunishmentPurpose.Game,
      Airstrike.MuteDuration,
      `Had ${context.commandPrefix}${this.triggers[0]} on them by ${context.username}`
    )

    return `${mojangProfile.name} ${mojangProfile.name} ${mojangProfile.name} ${mojangProfile.name} ${mojangProfile.name} :D`
  }
}
