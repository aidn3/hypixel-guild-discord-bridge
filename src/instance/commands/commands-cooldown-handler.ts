import assert from 'node:assert'

import PromiseQueue from 'promise-queue'

import type { ChatEvent, Content, UserId } from '../../common/application-event.js'
import { ChannelType } from '../../common/application-event.js'
import type { ChatCommandContext, ChatCommandCooldown, ChatCommandHandler } from '../../common/commands.js'
import { CooldownType } from '../../common/commands.js'
import type { Users } from '../../core/users.js'
import { formatTime } from '../../utility/shared-utility.js'

import type { CommandsCooldown } from './commands-cooldown.js'

export class CommandsCooldownHandler {
  private readonly globalCooldown = new Map<ChatCommandHandler, PromiseQueue>()
  private readonly channelCooldown = new Map<ChatCommandHandler, Map<ChannelType, PromiseQueue>>()
  private readonly userCooldown = new Map<ChatCommandHandler, Map<UserId, PromiseQueue>>()

  constructor(
    private readonly users: Users,
    private readonly config: CommandsCooldown
  ) {}

  public async handle(
    command: ChatCommandHandler,
    cooldownOptions: ChatCommandCooldown,
    context: ChatCommandContext
  ): Promise<Content | string> {
    const currentTime = Date.now()
    const lastExecutionAt = this.getLastExecution(command, cooldownOptions, context.message)
    if (cooldownOptions.type !== CooldownType.Disabled) {
      const cooldownTime = cooldownOptions.duration
      const timeLeft = lastExecutionAt + cooldownTime.toMilliseconds() - currentTime
      if (timeLeft > 0) {
        return `Command ${context.commandPrefix}${command.triggers[0]} can be executed again in ${formatTime(timeLeft)}.`
      }
      this.setLastExecution(command, cooldownOptions, context.message)

      return await this.executeOrFailCommand(command, cooldownOptions.type, context)
    }

    return await command.handler(context)
  }

  public resetCooldown(command: ChatCommandHandler, cooldownOptions: ChatCommandCooldown, event: ChatEvent): void {
    switch (cooldownOptions.type) {
      case CooldownType.Disabled: {
        // do nothing
        break
      }
      case CooldownType.Global: {
        this.config.resetGlobalLastExecutionTime(command.id)
        break
      }
      case CooldownType.Community: {
        // TODO: community and global are the same for now
        this.config.resetGlobalLastExecutionTime(command.id)
        break
      }
      case CooldownType.Channel: {
        if (event.channelType === ChannelType.Public || event.channelType === ChannelType.Officer) {
          this.config.resetChannelLastExecutionTime(command.id, event.channelType)
        }
        break
      }
      case CooldownType.User: {
        this.config.resetUserLastExecutionTime(command.id, event.user)
        break
      }
      default: {
        cooldownOptions satisfies never
      }
    }
  }

  private async executeOrFailCommand(
    command: ChatCommandHandler,
    cooldownType: CooldownType.User | CooldownType.Channel | CooldownType.Community | CooldownType.Global,
    context: ChatCommandContext
  ): Promise<Content | string> {
    const singletons = this.getSingleton(command, cooldownType, context)
    assert.notStrictEqual(singletons.length, 0)

    for (const singleton of singletons) {
      if (singleton.getQueueLength() > 0 || singleton.getPendingLength() > 0) {
        return `Command ${context.commandPrefix}${command.triggers[0]} is already in use.`
      }
    }

    const singleton = singletons[0]
    return singleton.add(async () => command.handler(context))
  }

  /**
   * Get any related queue to the command cooldown. First queue will be the main queue that should be used.
   * @private
   */
  private getSingleton(
    command: ChatCommandHandler,
    cooldownType: CooldownType.User | CooldownType.Channel | CooldownType.Community | CooldownType.Global,
    context: ChatCommandContext
  ): PromiseQueue[] {
    switch (cooldownType) {
      // TODO: global and community the same for now
      case CooldownType.Global:
      case CooldownType.Community: {
        let singleton = this.globalCooldown.get(command)
        if (singleton === undefined) {
          singleton = new PromiseQueue(1)
          this.globalCooldown.set(command, singleton)
        }
        return [singleton]
      }
      case CooldownType.Channel: {
        const channelType = context.message.channelType
        let channelSingleton = this.channelCooldown.get(command)
        if (channelSingleton === undefined) {
          channelSingleton = new Map()
          this.channelCooldown.set(command, channelSingleton)
        }

        let singleton = channelSingleton.get(channelType)
        if (singleton === undefined) {
          singleton = new PromiseQueue(1)
          channelSingleton.set(channelType, singleton)
        }
        return [singleton]
      }
      case CooldownType.User: {
        const userIds = this.users.resolveAllUserId(context.message.user)
        const userId = userIds[0]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        assert.ok(userId !== undefined)

        let userSingleton = this.userCooldown.get(command)
        if (userSingleton === undefined) {
          userSingleton = new Map()
          this.userCooldown.set(command, userSingleton)
        }

        if (userIds.length === 1) {
          let singleton = userSingleton.get(userId)
          if (singleton === undefined) {
            singleton = new PromiseQueue(1)
            userSingleton.set(userId, singleton)
          }
          return [singleton]
        }

        const singletons: PromiseQueue[] = userIds
          .filter((entry) => entry !== userId)
          .map((entry) => userSingleton.get(entry))
          .filter((entry) => entry !== undefined)

        let mainSingleton = userSingleton.get(userId)
        if (mainSingleton === undefined) {
          mainSingleton = new PromiseQueue(1)
          userSingleton.set(userId, mainSingleton)
        }
        singletons.unshift(mainSingleton)

        return singletons
      }
      default: {
        cooldownType satisfies never
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert.fail(`Unknown cooldown type: ${cooldownType}`)
      }
    }
  }

  private getLastExecution(
    command: ChatCommandHandler,
    cooldownOptions: ChatCommandCooldown,
    event: ChatEvent
  ): number {
    switch (cooldownOptions.type) {
      case CooldownType.Disabled: {
        return 0
      }
      case CooldownType.Global: {
        return this.config.getGlobalLastExecutionTime(command.id)
      }
      case CooldownType.Community: {
        // TODO: global and community are the same for now
        return this.config.getGlobalLastExecutionTime(command.id)
      }
      case CooldownType.Channel: {
        if (event.channelType === ChannelType.Public || event.channelType === ChannelType.Officer) {
          return this.config.getChannelLastExecutionTime(command.id, event.channelType)
        }
        return 0
      }
      case CooldownType.User: {
        return this.config.getUserLastExecutionTime(command.id, event.user)
      }
      default: {
        cooldownOptions satisfies never
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert.fail(`Unknown cooldown type: ${cooldownOptions}`)
      }
    }
  }

  private setLastExecution(command: ChatCommandHandler, cooldownOptions: ChatCommandCooldown, event: ChatEvent): void {
    switch (cooldownOptions.type) {
      case CooldownType.Disabled: {
        return
      }
      case CooldownType.Global: {
        this.config.updateGlobalLastExecutionTime(command.id)
        return
      }
      case CooldownType.Community: {
        // TODO: global and community are the same for now
        this.config.updateGlobalLastExecutionTime(command.id)
        return
      }
      case CooldownType.Channel: {
        if (event.channelType === ChannelType.Public || event.channelType === ChannelType.Officer) {
          this.config.updateChannelLastExecutionTime(command.id, event.channelType)
        }
        return
      }
      case CooldownType.User: {
        this.config.updateUserLastExecutionTime(command.id, event.user)
        return
      }
      default: {
        cooldownOptions satisfies never
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert.fail(`Unknown cooldown type: ${cooldownOptions}`)
      }
    }
  }
}
