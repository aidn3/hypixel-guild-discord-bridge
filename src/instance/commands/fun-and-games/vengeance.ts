import { ChannelType, Permission, Platform, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration.js'
import { usernameNotExists } from '../common/utility.js'

export default class Vengeance extends ChatCommandHandler {
  private static readonly MuteDuration = Duration.minutes(5)

  private countSinceLastWin = 0
  private consecutiveLose = 0

  constructor() {
    super({
      type: ChatCommandGroup.General,
      id: 'vengeance',
      triggers: ['vengeance', 'v'],
      description: 'Try your luck against another player for a 5 minute mute',
      example: `v %s`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft], sources: [ChannelType.Public] }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] as string | undefined
    if (givenUsername === undefined) return `${context.username}, you need to specify someone!`

    if (context.app.minecraftManager.isMinecraftBot(givenUsername)) {
      return `${context.username}, You can't take vengeance against the bot itself!`
    }

    if (givenUsername.toLowerCase() === 'everyone') {
      return `${context.username}, You can't take vengeance against everyone!`
    }

    const mojangProfile = await context.app.mojangApi.profileByUsername(givenUsername).catch(() => undefined)
    if (mojangProfile == undefined) return usernameNotExists(context, givenUsername)
    const targetUser = await context.app.core.initializeMinecraftUser(mojangProfile, {})

    let messages: string[]
    // 3% to win.
    // 47% to lose.
    // 49% to draw.
    if (this.won()) {
      if ((await targetUser.permission()) < Permission.Helper && !(await targetUser.immune())) {
        await targetUser.mute(
          context.eventHelper.fillBaseEvent(),
          PunishmentPurpose.Game,
          Vengeance.MuteDuration,
          'Lost in Vengeance game'
        )
      }

      messages = context.app.i18n.t(($) => $['commands.vengeance.win'], {
        returnObjects: true,
        username: context.message.user.displayName(),
        target: targetUser.displayName()
      })
    } else if (this.lose()) {
      if ((await context.message.user.permission()) < Permission.Helper && !(await context.message.user.immune())) {
        await context.message.user.mute(
          context.eventHelper.fillBaseEvent(),
          PunishmentPurpose.Game,
          Vengeance.MuteDuration,
          'Lost in Vengeance game'
        )
      }

      this.countSinceLastWin++
      messages = context.app.i18n.t(($) => $['commands.vengeance.lose'], {
        returnObjects: true,
        username: context.message.user.displayName(),
        target: targetUser.displayName()
      })
    } else {
      this.countSinceLastWin++
      messages = context.app.i18n.t(($) => $['commands.vengeance.draw'], {
        returnObjects: true,
        username: context.message.user.displayName(),
        target: targetUser.displayName()
      })
    }

    return messages[Math.floor(Math.random() * messages.length)]
      .replaceAll('{username}', context.username)
      .replaceAll('{target}', givenUsername)
  }

  private won(): boolean {
    const chance = 1 / 32
    const increasedChanceAfter = 12
    const guaranteedOn = 24

    let currentChance = chance

    if (this.countSinceLastWin > increasedChanceAfter) {
      // This function has a starting point of (0,0) and goes to (inf,1)
      // with an increasingly faster slope with every step
      currentChance += -(1 / ((this.countSinceLastWin - increasedChanceAfter) / 24 + 1)) + 1
    }
    if (this.countSinceLastWin >= guaranteedOn) {
      currentChance = 1
    }

    if (Math.random() < currentChance) {
      this.countSinceLastWin = 0
      return true
    }

    return false
  }

  private lose(): boolean {
    if (this.consecutiveLose >= 5) {
      this.consecutiveLose = 0
      return false
    }

    if (Math.random() < 0.5) {
      this.consecutiveLose++
      return true
    }

    this.consecutiveLose = 0
    return false
  }
}
