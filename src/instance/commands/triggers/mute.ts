import { ChannelType, InstanceType, Permission, PunishmentPurpose } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { formatTime } from '../../../utility/shared-utility'

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
  private static readonly TimeLength = Duration.minutes(5)
  private lastCommandExecutionAt = 0

  constructor() {
    super({
      triggers: ['mute'],
      description: 'mute a random online person for 5 minutes for no good reason',
      example: `mute`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.instanceType !== InstanceType.Minecraft || context.message.channelType !== ChannelType.Public) {
      return 'Command can only be executed in-game in guild public channel'
    }
    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + Mute.TimeLength.toMilliseconds() > currentTime) {
      return `Can use command again in ${formatTime(this.lastCommandExecutionAt + Mute.TimeLength.toMilliseconds() - currentTime)}.`
    }
    this.lastCommandExecutionAt = currentTime

    await context.sendFeedback('Choosing a victim...')
    const usernames = await this.getUsernames(context)
    if (usernames.length === 0) return 'No username to randomly mute??'

    const selectedUsername = usernames[Math.floor(Math.random() * usernames.length)]
    const userProfile = await context.app.mojangApi.profileByUsername(selectedUsername)
    const user = await context.app.core.initializeMinecraftUser(userProfile, {})
    if (user.permission() >= Permission.Helper || user.immune()) {
      return `I tried to mute ${selectedUsername}, but then I remembered I'll die if I were to touch this person XD`
    }

    await user.mute(
      context.eventHelper.fillBaseEvent(),
      PunishmentPurpose.Game,
      Mute.TimeLength,
      `randomly selected by ${context.commandPrefix}${this.triggers[0]}`
    )

    const messages = context.app.core.languageConfigurations.getCommandMuteGame()
    return messages[Math.floor(Math.random() * messages.length)]
      .replaceAll('{username}', context.username)
      .replaceAll('{target}', selectedUsername)
  }

  private async getUsernames(context: ChatCommandContext): Promise<string[]> {
    const instances = context.app.minecraftManager.getAllInstances()

    const usernames: Promise<string[]>[] = []
    for (const instance of instances) {
      const chunk = context.app.core.guildManager
        .list(instance.instanceName)
        .then((guild) => guild.members)
        .then((members) => members.filter((member) => member.online).map((member) => member.username))
        .then((usernames) => usernames.filter((username) => !context.app.minecraftManager.isMinecraftBot(username)))
        .catch(() => [] as string[])

      usernames.push(chunk)
    }

    const resolvedChunks = await Promise.all(usernames)
    return resolvedChunks.flat()
  }
}
