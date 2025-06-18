import { InstanceType } from '../../../common/application-event.js'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { checkChatTriggers, PrivateMessageChat } from '../../../util/chat-triggers.js'
import { antiSpamString } from '../../../util/shared-util.js'
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
      return `Can use command again in ${Math.floor((this.lastCommandExecutionAt + Boop.CommandCoolDown - currentTime) / 1000)} seconds.`
    }
    const minecraftInstanceName =
      context.instanceType === InstanceType.Minecraft
        ? context.instanceName
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
      `/boop ${givenUsername} @${antiSpamString()} @${antiSpamString()} @${antiSpamString()} @${antiSpamString()}`,
      givenUsername
    )
    switch (result.status) {
      case 'success': {
        return `${givenUsername} has been booped!`
      }
      case 'failed': {
        return `Can not boop ${givenUsername}: ${result.message.length > 0 ? result.message[0].content : 'No idea why :D'}`
      }
      case 'error': {
        return `Could not boop ${givenUsername} for some unknown reason`
      }
    }
  }

  private getActiveMinecraftInstanceName(minecraftManager: MinecraftManager): string | undefined {
    return minecraftManager.getAllInstances().find((instance) => instance.currentStatus() === Status.Connected)
      ?.instanceName
  }
}
