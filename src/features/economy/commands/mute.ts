import { ChannelType, Permission, Platform, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandRequirements } from '../../../common/commands.js'
import { ChatCommandGroup, ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import type { MinecraftUser } from '../../../common/user.js'
import { EconomyMute } from '../economy-constants.js'
import { type EconomyDatabase, EconomyNotEnough, EconomyReason } from '../economy-database.js'

export default class Mute extends ChatCommandHandler {
  public static readonly DefaultMessages = [
    `Muting {target} cause why not!`,
    `{target} was randomly selected to win the ultimate prize: a mute :D`,
    'Oh no. Guess we did it this time by getting {target} muted',
    '{target}, go bite {username} for getting you muted!',
    `What a wonderful gift. from {username} to {target}, a random mute for absolutely no reason!`,
    '{target} seems down lately. Imma mute them :>',
    `{username} did you seriously just execute this command? Fine. {target}, you are muted!`,
    '{username} -> {target} attack!',
    '{username}, would you dare using the command again? :>',
    '{username}, this is russian roulette but with mandatory participating. Also {target} just died.',
    '{target} has nothing to say any time soon... :3',
    'I muted someone, but who? :)',
    'I am agent of chaos!'
  ]

  constructor(private readonly database: EconomyDatabase) {
    super({
      type: ChatCommandGroup.Economy,
      id: 'mute',
      triggers: ['mute'],
      description: 'Mute a random online person for 5 minutes for no good reason',
      example: `mute`
    })
  }

  override requirements(): ChatCommandRequirements | string {
    return { platforms: [Platform.Minecraft], sources: [ChannelType.Public] }
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.Community, duration: EconomyMute.cooldown }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    await context.sendFeedback('Choosing a victim...')
    const usernames = await this.getUsernames(context)
    const targetUser = await this.selectUser(context, usernames)
    if (targetUser === undefined) {
      context.resetCooldown()
      return 'No username to randomly mute??'
    }

    const responsibleUser = context.message.user
    const targetId = context.app.core.users.resolveUserId(targetUser.getUserIdentifier())
    try {
      this.database.transaction((context) => {
        context
          .getAccount(responsibleUser)
          .decrease(EconomyMute.amount, { reason: EconomyReason.MuteTarget, byUser: targetId })
      })
    } catch (error: unknown) {
      if (error instanceof EconomyNotEnough) {
        context.resetCooldown()
        return `${context.message.user.displayName()}, need ${EconomyMute.amount} aura to use this!`
      }
      throw error
    }

    await targetUser.mute(
      context.eventHelper.fillBaseEvent(),
      PunishmentPurpose.Game,
      EconomyMute.mute,
      `randomly selected by ${context.commandPrefix}${this.triggers[0]}`
    )

    const messages = context.app.core.languageConfigurations.getCommandMuteGame()
    return messages[Math.floor(Math.random() * messages.length)]
      .replaceAll('{username}', context.username)
      .replaceAll('{target}', targetUser.mojangProfile().name)
  }

  private async getUsernames(context: ChatCommandContext): Promise<string[]> {
    const instances = context.app.minecraftManager.getAllInstances()

    const usernames: Promise<string[]>[] = []
    for (const instance of instances) {
      const chunk = instance.guildManager
        .list()
        .then((guild) => guild.members)
        .then((members) => members.filter((member) => member.online).map((member) => member.username))
        .then((usernames) => usernames.filter((username) => !context.app.minecraftManager.isMinecraftBot(username)))
        .catch(() => [] as string[])

      usernames.push(chunk)
    }

    const resolvedChunks = await Promise.all(usernames)
    return resolvedChunks.flat()
  }

  private async selectUser(context: ChatCommandContext, usernames: string[]): Promise<MinecraftUser | undefined> {
    while (usernames.length > 0) {
      const index = Math.floor(Math.random() * usernames.length)
      const username = usernames[index]
      usernames.splice(index, 1)

      const profile = await context.app.mojangApi.profileByUsername(username)
      const user = await context.app.core.initializeMinecraftUser(profile, {})

      if ((await user.permission()) >= Permission.Helper || (await user.immune())) {
        continue
      }

      return user
    }

    return undefined
  }
}
