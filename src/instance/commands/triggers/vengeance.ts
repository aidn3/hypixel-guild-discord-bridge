import { ChannelType, InstanceType, Permission, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { canOnlyUseIngame, usernameNotExists } from '../common/utility'

export default class Vengeance extends ChatCommandHandler {
  public static readonly LossMessages = [
    '{username} tried to blast {target} but failed epically and ended up blasting themself!',
    '{username} unlucky, wrong choice.',
    '{username}, this is what you get for trying to blast {target}!',
    '{username} died',
    '{username} tried to mute {target} but got muted instead, haha!',
    '{username} better luck next time. Or not...',
    '{username} was punished for trying to mute {target}',
    '{username}, aya, are you still trying to mute {target}? How petty.'
  ]

  public static readonly DrawMessages = [
    '{username} Click. Click. Click. It is empty!',
    '{username}, remind me what the plan was again?',
    '{username}, I forgot to take vengeance.',
    '{username}, I was supposed to take vengeance against {target} but I changed my mind :P',
    '{username} tried to kill {target} but they dodged every bullet like Neo!'
  ]

  public static readonly WinMessages = [
    '{username} is Batman!',
    '{target} survival was never an option',
    '{username}, I am Agent 47. The job is done.',
    '{target}? Dead? That was the only possible outcome.'
  ]

  private static readonly MuteDuration = Duration.minutes(5)

  private countSinceLastWin = 0
  private consecutiveLose = 0

  constructor() {
    super({
      triggers: ['vengeance', 'v'],
      description: 'Try your luck against another player for a 5 minute mute',
      example: `v %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.instanceType !== InstanceType.Minecraft) {
      return canOnlyUseIngame(context)
    }
    if (context.message.channelType !== ChannelType.Public) {
      return `${context.username}, Command can only be executed in public chat!`
    }

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
    if ((await targetUser.permission()) >= Permission.Helper || (await targetUser.immune())) {
      return `No way I'm helping with taking vengeance against ${mojangProfile.name}!`
    }

    let messages: string[]
    // 3% to win.
    // 47% to lose.
    // 49% to draw.
    if (this.won()) {
      await targetUser.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        Vengeance.MuteDuration,
        'Lost in Vengeance game'
      )
      messages = context.app.core.languageConfigurations.getCommandVengeanceWin()
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
      messages = context.app.core.languageConfigurations.getCommandVengeanceLose()
    } else {
      this.countSinceLastWin++
      messages = context.app.core.languageConfigurations.getCommandVengeanceDraw()
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
