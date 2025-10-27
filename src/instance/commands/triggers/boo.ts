import { InstanceType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { checkChatTriggers, PrivateMessageChat } from '../../../utility/chat-triggers.js'
import { antiSpamString } from '../../../utility/shared-utility'
// eslint-disable-next-line import/no-restricted-paths
import type { MinecraftManager } from '../../minecraft/minecraft-manager.js'

export default class Boo extends ChatCommandHandler {
  private static readonly CommandCoolDown = 60_000
  private lastCommandExecutionAt = 0

  constructor() {
    super({
      triggers: ['boo'],
      description: '/boo a player in-game',
      example: `boo %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const now = new Date()
    if (now.getMonth() !== 9) {
      return `You can only scare people in October!`
    }

    const givenUsername = context.args[0] ?? context.username
    const currentTime = Date.now()
    if (this.lastCommandExecutionAt + Boo.CommandCoolDown > currentTime) {
      return `Can use command again in ${Math.floor((this.lastCommandExecutionAt + Boo.CommandCoolDown - currentTime) / 1000)} seconds.`
    }
    const minecraftInstanceName =
      context.message.instanceType === InstanceType.Minecraft
        ? context.message.instanceName
        : this.getActiveMinecraftInstanceName(context.app.minecraftManager)
    if (minecraftInstanceName === undefined) {
      return `No active connected Minecraft account exists to use`
    }
    this.lastCommandExecutionAt = currentTime

    const result = await checkChatTriggers(
      context.app,
      context.eventHelper,
      PrivateMessageChat,
      [minecraftInstanceName],
      `/boo ${givenUsername} @${antiSpamString()} @${antiSpamString()} @${antiSpamString()} @${antiSpamString()}`,
      givenUsername
    )
    switch (result.status) {
      case 'success': {
        return `${givenUsername} has been spooked!`
      }
      case 'failed': {
        return `Can not scare ${givenUsername}: ${result.message.length > 0 ? result.message[0].content : 'No idea why :D'}`
      }
      case 'error': {
        return `Could not scare ${givenUsername} for some unknown reason`
      }
    }
  }

  private getActiveMinecraftInstanceName(minecraftManager: MinecraftManager): string | undefined {
    return minecraftManager.getAllInstances().find((instance) => instance.currentStatus() === Status.Connected)
      ?.instanceName
  }
}
