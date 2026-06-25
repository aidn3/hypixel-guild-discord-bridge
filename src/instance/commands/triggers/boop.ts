import { Platform } from '../../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown } from '../../../common/commands.js'
import { ChatCommandHandler, CooldownType } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { checkChatTriggers, PrivateMessageChat } from '../../../utility/chat-triggers.js'
import Duration from '../../../utility/duration'
import { antiSpamString } from '../../../utility/shared-utility'
// eslint-disable-next-line import/no-restricted-paths
import type MinecraftInstance from '../../minecraft/minecraft-instance'
// eslint-disable-next-line import/no-restricted-paths
import type { MinecraftManager } from '../../minecraft/minecraft-manager.js'

export default class Boop extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['boop'],
      description: '/boop a player in-game',
      example: `boop %s`
    })
  }

  override cooldownOptions(): ChatCommandCooldown {
    return { type: CooldownType.Community, duration: Duration.minutes(1) }
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const minecraftInstanceName =
      context.message.platform === Platform.Minecraft
        ? context.message.instance
        : this.getActiveMinecraftInstanceName(context.app.minecraftManager)
    if (minecraftInstanceName === undefined) {
      context.resetCooldown()
      return context.app.i18n.t(($) => $['commands.boop.no-account'])
    }

    const result = await checkChatTriggers(
      context.app,
      PrivateMessageChat,
      [minecraftInstanceName],
      `/boop ${givenUsername} @${antiSpamString()} @${antiSpamString()} @${antiSpamString()} @${antiSpamString()}`,
      givenUsername
    )
    switch (result.status) {
      case 'success': {
        return context.app.i18n.t(($) => $['commands.boop.success'], { username: givenUsername })
      }
      case 'failed': {
        return context.app.i18n.t(($) => $['commands.boop.failed'], {
          username: givenUsername,
          reason: result.message.length > 0 ? result.message[0].content : 'No idea why :D'
        })
      }
      case 'error': {
        return context.app.i18n.t(($) => $['commands.boop.error'], { username: givenUsername })
      }
    }
  }

  private getActiveMinecraftInstanceName(minecraftManager: MinecraftManager): MinecraftInstance | undefined {
    return minecraftManager.getAllInstances().find((instance) => instance.currentStatus() === Status.Connected)
  }
}
