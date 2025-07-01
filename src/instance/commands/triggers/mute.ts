import {
  ChannelType,
  InstanceType,
  MinecraftSendChatPriority,
  PunishmentType
} from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatTime } from '../../../util/shared-util.js'

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
  private static readonly CommandCoolDown = 300_000
  private lastCommandExecutionAt = 0

  constructor() {
    super({
      triggers: ['mute'],
      description: 'mute a random online person for 5 minutes for no good reason',
      example: `mute`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.instanceType !== InstanceType.Minecraft || context.channelType !== ChannelType.Public) {
      return 'Command can only be executed in-game in guild public channel'
    }
    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + Mute.CommandCoolDown > currentTime) {
      return `Can use command again in ${formatTime(this.lastCommandExecutionAt + Mute.CommandCoolDown - currentTime)} seconds.`
    }

    context.sendFeedback('Choosing a victim...')
    const members = await context.app.usersManager.guildManager.onlineMembers(context.instanceName)
    const usernames = members.flatMap((entry) => [...entry.usernames])
    if (usernames.length === 0) return 'No username to randomly mute??'

    const selectedUsername = usernames[Math.floor(Math.random() * usernames.length)]
    this.mute(context, selectedUsername)

    const messages = context.app.language.data.commandRouletteLose
    return messages[Math.floor(Math.random() * messages.length)].replaceAll('{username}', context.username)
  }

  private mute(context: ChatCommandContext, selectedUsername: string): void {
    context.app.emit('minecraftSend', {
      ...context.eventHelper.fillBaseEvent(),
      targetInstanceName: context.app.getInstancesNames(InstanceType.Minecraft),
      priority: MinecraftSendChatPriority.High,
      command: `/g mute ${selectedUsername} 5m`
    })

    context.app.moderation.punishments.add({
      ...context.eventHelper.fillBaseEvent(),

      userName: context.username,
      // not really that important to resolve uuid since it ends fast and the punishment is just a game
      userUuid: undefined,
      userDiscordId: undefined,

      type: PunishmentType.Mute,
      till: Date.now() + 900_000,
      reason: `randomly selected by ${context.commandPrefix}${this.triggers[0]}`
    })
  }
}
