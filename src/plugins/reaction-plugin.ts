import type Application from '../application.js'
import { GuildPlayerEventType, InstanceType, MinecraftSendChatPriority } from '../common/application-event.js'
import { OfficialPlugins } from '../common/application-internal-config.js'
import type { PluginInfo } from '../common/plugin-instance.js'
import PluginInstance from '../common/plugin-instance.js'

export default class ReactionPlugin extends PluginInstance {
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

  constructor(application: Application) {
    super(application, OfficialPlugins.Reaction)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Send a greeting/reaction message when a member joins/leaves or is kicked from the guild' }
  }

  onReady(): Promise<void> | void {
    this.application.on('guildPlayer', (event) => {
      if (!this.enabled()) return

      if (event.type === GuildPlayerEventType.Join) {
        let message = ReactionPlugin.JoinMessages[Math.floor(Math.random() * ReactionPlugin.JoinMessages.length)]
        message = message.replaceAll('%s', event.username)
        this.application.emit('minecraftSend', {
          ...this.eventHelper.fillBaseEvent(),
          targetInstanceName: this.application.clusterHelper.getInstancesNames(InstanceType.Minecraft),
          priority: MinecraftSendChatPriority.High,
          command: `/gc ${message}`
        })
      }

      if (event.type === GuildPlayerEventType.Leave) {
        let message = ReactionPlugin.LeaveMessages[Math.floor(Math.random() * ReactionPlugin.LeaveMessages.length)]
        message = message.replaceAll('%s', event.username)
        this.application.emit('minecraftSend', {
          ...this.eventHelper.fillBaseEvent(),
          targetInstanceName: this.application.clusterHelper.getInstancesNames(InstanceType.Minecraft),
          priority: MinecraftSendChatPriority.High,
          command: `/gc ${message}`
        })
      }

      if (event.type === GuildPlayerEventType.Kick) {
        let message = ReactionPlugin.KickMessages[Math.floor(Math.random() * ReactionPlugin.KickMessages.length)]
        message = message.replaceAll('%s', event.username)
        this.application.emit('minecraftSend', {
          ...this.eventHelper.fillBaseEvent(),
          targetInstanceName: this.application.clusterHelper.getInstancesNames(InstanceType.Minecraft),
          priority: MinecraftSendChatPriority.High,
          command: `/gc ${message}`
        })
      }
    })
  }
}
