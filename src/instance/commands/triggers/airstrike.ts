import { ChannelType, InstanceType, Permission, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'
import { canOnlyUseIngame, usernameNotExists } from '../common/utility'

export default class Airstrike extends ChatCommandHandler {
  private static readonly MuteDuration = Duration.minutes(1)
  private static readonly CommandCooldown = Duration.hours(1)
  private lastCommandExecutionAt = 0

  constructor() {
    super({
      triggers: ['airstrike', 'as'],
      description: 'Mute a specific person to annoy them',
      example: `airstrike %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.instanceType !== InstanceType.Minecraft) {
      return canOnlyUseIngame(context)
    }
    if (context.message.channelType !== ChannelType.Public) {
      return `${context.username}, Command can only be executed in public chat!`
    }

    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + Airstrike.CommandCooldown.toMilliseconds() > currentTime) {
      const timeLeft = this.lastCommandExecutionAt + Airstrike.CommandCooldown.toMilliseconds() - currentTime
      return `Can use command again in ${formatTime(timeLeft)}.`
    }

    const givenUsername = context.args[0] as string | undefined
    if (givenUsername === undefined) return `${context.username}, you need to specify someone!`

    if (context.app.minecraftManager.isMinecraftBot(givenUsername)) {
      return `${context.username}, You can't airstrike the bot itself!`
    }
    if (givenUsername.toLowerCase() === 'everyone') {
      return `${context.username}, You can't airstrike everyone!`
    }

    const mojangProfile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (mojangProfile == undefined) return usernameNotExists(context, givenUsername)
    const targetUser = await context.app.core.initializeMinecraftUser(mojangProfile, {})
    if ((await targetUser.permission()) >= Permission.Helper || (await targetUser.immune())) {
      return `No way doing an airstrike on ${mojangProfile.name}!`
    }

    await targetUser.mute(
      context.eventHelper.fillBaseEvent(),
      PunishmentPurpose.Game,
      Airstrike.MuteDuration,
      `Had ${context.commandPrefix}${this.triggers[0]} on them by ${context.username}`
    )

    this.lastCommandExecutionAt = currentTime
    return `${mojangProfile.name} ${mojangProfile.name} ${mojangProfile.name} ${mojangProfile.name} ${mojangProfile.name} :D`
  }
}
