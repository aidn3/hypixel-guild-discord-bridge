import { InstanceType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { checkChatTriggers, PrivateMessageChat } from '../../../utility/chat-triggers.js'
import { antiSpamString } from '../../../utility/shared-utility'
// eslint-disable-next-line import/no-restricted-paths
import type { MinecraftManager } from '../../minecraft/minecraft-manager.js'

export default class Boop extends ChatCommandHandler {
  private static readonly CommandCoolDown = 60_000
  private lastCommandExecutionAt = 0

  constructor() {
    super({
      triggers: ['boop'],
      description: '/boop a player in-game',
      example: `boop %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username
    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + Boop.CommandCoolDown > currentTime) {
      return context.app.i18n.t(($) => $['commands.boop.cooldown'], {
        cooldown: Math.floor((this.lastCommandExecutionAt + Boop.CommandCoolDown - currentTime) / 1000)
      })
    }
    const minecraftInstanceName =
      context.message.instanceType === InstanceType.Minecraft
        ? context.message.instanceName
        : this.getActiveMinecraftInstanceName(context.app.minecraftManager)
    if (minecraftInstanceName === undefined) {
      return context.app.i18n.t(($) => $['commands.boop.no-account'])
    }
    this.lastCommandExecutionAt = currentTime

    const result = await checkChatTriggers(
      context.app,
      context.eventHelper,
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

  private getActiveMinecraftInstanceName(minecraftManager: MinecraftManager): string | undefined {
    return minecraftManager.getAllInstances().find((instance) => instance.currentStatus() === Status.Connected)
      ?.instanceName
  }
}
