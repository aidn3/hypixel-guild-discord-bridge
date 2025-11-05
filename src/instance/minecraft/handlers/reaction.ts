import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { ChannelType, Color, GuildPlayerEventType, type InstanceType } from '../../../common/application-event.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class Reaction extends SubInstance<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  public static JoinMessages = [
    'Welcome {username} to our guild! Do /g discord and !help for ingame commands :-)',
    "{username}, what a nice new member. Why don't you run /g discord & !help here while you're at it :P",
    'Psst {username}. You just joined. Do /g discord and !help here :D',
    '{username} since you are a member now, do !e and /g discord',
    "Can we take a moment to applaud {username} for joining us. Don't forget to do /g discord :3",
    '{username} joined the guild. What a legend. Do /g discord',
    'Hey {username} and welcome to the guild! Run /g discord',
    '{username} nice, new member! Do /g discord to join our community (*・‿・)ノ⌒*:･ﾟ✧'
  ]

  public static readonly LeaveMessages = [
    'Oh. {username} just left us :(',
    'L {username} for leaving',
    'See you later {username}',
    'Adios {username} o/',
    "{username} wasn't cool enough for us.",
    '{username} left. I wonder why?',
    '{username} left. What a shame.'
  ]

  public static readonly KickMessages = [
    '{username} got drop kicked! LOL',
    'See you later {username}, or not :P',
    '{username} was forcefully evicted.',
    "{username} wasn't welcome here.",
    'Goodbye {username}. Forever.'
  ]

  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<InstanceType.Minecraft>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.application.on('guildPlayer', (event) => {
      if (
        event.instanceName !== this.clientInstance.instanceName ||
        event.instanceType !== this.clientInstance.instanceType
      )
        return

      if (
        event.type === GuildPlayerEventType.Join &&
        this.application.core.minecraftConfigurations.getJoinGuildReaction()
      ) {
        const messages = this.application.language.data.guildJoinReaction
        if (messages.length === 0) {
          this.logger.error('There is no guild join reaction messages. Dropping the reaction entirely.')
          return
        }
        let message = messages[Math.floor(Math.random() * messages.length)]
        message = message.replaceAll('{username}', event.user.displayName())

        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Good,

          user: event.user,
          message: message
        })
      }

      if (
        event.type === GuildPlayerEventType.Leave &&
        this.application.core.minecraftConfigurations.getLeaveGuildReaction()
      ) {
        const messages = this.application.language.data.guildLeaveReaction
        if (messages.length === 0) {
          this.logger.error('There is no guild leave reaction messages. Dropping the reaction entirely.')
          return
        }
        let message = messages[Math.floor(Math.random() * messages.length)]
        message = message.replaceAll('{username}', event.user.displayName())
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Bad,

          user: event.user,
          message: message
        })
      }

      if (
        event.type === GuildPlayerEventType.Kick &&
        this.application.core.minecraftConfigurations.getKickGuildReaction()
      ) {
        const messages = this.application.language.data.guildKickReaction
        if (messages.length === 0) {
          this.logger.error('There is no guild kick reaction messages. Dropping the reaction entirely.')
          return
        }
        let message = messages[Math.floor(Math.random() * messages.length)]
        message = message.replaceAll('{username}', event.user.displayName())
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Bad,

          user: event.user,
          message: message
        })
      }
    })
  }
}
