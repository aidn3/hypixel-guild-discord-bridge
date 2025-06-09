import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import { ChannelType, Color, GuildPlayerEventType, type InstanceType } from '../../../common/application-event.js'
import EventHandler from '../../../common/event-handler.js'
import type EventHelper from '../../../common/event-helper.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export default class Reaction extends EventHandler<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  private static readonly JoinMessages = [
    'Welcome %s to our guild! Do /g discord and !help for ingame commands :-)',
    "%s, what a nice new member. Why don't you run /g discord & !help here while you're at it :P",
    'Psst %s. You just joined. Do /g discord and !help here :D',
    '%s since you are a member now, do !e and /g discord',
    "Can we take a moment to applaud %s for joining us. Don't forget to do /g discord :3",
    '%s joined the guild. What a legend. Do /g discord',
    'Hey %s and welcome to the guild! Run /g discord',
    '%s nice, new member! Do /g discord to join our community (*・‿・)ノ⌒*:･ﾟ✧'
  ]

  private static readonly LeaveMessages = [
    'Oh. %s just left us :(',
    'L %s for leaving',
    'See you later %s',
    'Adios %s o/',
    "%s wasn't cool enough for us.",
    '%s left. I wonder why?',
    '%s left. What a shame.'
  ]

  private static readonly KickMessages = [
    '%s got drop kicked! LOL',
    'See you later %s, or not :P',
    '%s was forcefully evicted.',
    "%s wasn't welcome here.",
    'Goodbye %s. Forever.'
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
        this.application.minecraftManager.getConfig().data.joinGuildReaction
      ) {
        let message = Reaction.JoinMessages[Math.floor(Math.random() * Reaction.JoinMessages.length)]
        message = message.replaceAll('%s', event.username)

        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Good,

          username: event.username,
          message: message
        })
      }

      if (
        event.type === GuildPlayerEventType.Leave &&
        this.application.minecraftManager.getConfig().data.leaveGuildReaction
      ) {
        let message = Reaction.LeaveMessages[Math.floor(Math.random() * Reaction.LeaveMessages.length)]
        message = message.replaceAll('%s', event.username)
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Bad,

          username: event.username,
          message: message
        })
      }

      if (
        event.type === GuildPlayerEventType.Kick &&
        this.application.minecraftManager.getConfig().data.kickGuildReaction
      ) {
        let message = Reaction.KickMessages[Math.floor(Math.random() * Reaction.KickMessages.length)]
        message = message.replaceAll('%s', event.username)
        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Bad,

          username: event.username,
          message: message
        })
      }
    })
  }
}
