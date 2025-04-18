import assert from 'node:assert'

import { Client, GatewayIntentBits, Options, Partials } from 'discord.js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType, Permission } from '../../common/application-event.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'

import ChatManager from './chat-manager.js'
import { CommandManager } from './command-manager.js'
import MessageAssociation from './common/message-association.js'
import DiscordBridge from './discord-bridge.js'
import StateHandler from './handlers/state-handler.js'
import StatusHandler from './handlers/status-handler.js'
import LoggerManager from './logger-manager.js'

export default class DiscordInstance extends ConnectableInstance<DiscordConfig, InstanceType.Discord> {
  readonly commandsManager: CommandManager
  private readonly client: Client

  private readonly stateHandler: StateHandler
  private readonly statusHandler: StatusHandler
  private readonly chatManager: ChatManager
  private readonly loggerManager: LoggerManager

  private readonly bridge: DiscordBridge
  private readonly messageAssociation: MessageAssociation = new MessageAssociation()
  private connected = false

  constructor(app: Application, config: DiscordConfig) {
    super(app, InstanceType.Discord, InstanceType.Discord, config)

    this.client = new Client({
      makeCache: Options.cacheEverything(),
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      partials: [Partials.Channel, Partials.Message]
    })

    this.client.on('error', (error: Error) => {
      this.logger.error(error)
    })

    this.stateHandler = new StateHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    this.statusHandler = new StatusHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    this.chatManager = new ChatManager(
      this.application,
      this,
      this.messageAssociation,
      this.eventHelper,
      this.logger,
      this.errorHandler
    )
    this.commandsManager = new CommandManager(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    this.loggerManager = new LoggerManager(this.application, this, this.eventHelper, this.logger, this.errorHandler)

    this.bridge = new DiscordBridge(
      this.application,
      this,
      this.messageAssociation,
      this.logger,
      this.errorHandler,
      this.config
    )

    if (this.application.applicationInternalConfig.data.discord.publicChannelIds.length === 0) {
      this.logger.info('no Discord public channels found')
    }
    if (this.application.applicationInternalConfig.data.discord.officerChannelIds.length === 0) {
      this.logger.info('no Discord officer channels found')
    }
    if (this.application.applicationInternalConfig.data.discord.officerRoleIds.length === 0) {
      this.logger.info('no Discord officer roles found')
    }
  }

  public resolvePrivilegeLevel(userId: string, roles: string[]): Permission {
    if (userId === this.config.adminId) return Permission.Admin

    if (roles.some((role) => this.application.applicationInternalConfig.data.discord.officerRoleIds.includes(role))) {
      return Permission.Officer
    }

    if (roles.some((role) => this.application.applicationInternalConfig.data.discord.helperRoleIds.includes(role))) {
      return Permission.Helper
    }

    return Permission.Anyone
  }

  async connect(): Promise<void> {
    assert(this.config.key)

    if (this.connected) {
      this.logger.error('Instance already connected once. Calling connect() again will bug it. Returning...')
      return
    }
    this.connected = true

    this.setAndBroadcastNewStatus(Status.Connecting, 'Discord connecting')

    this.stateHandler.registerEvents(this.client)
    this.statusHandler.registerEvents(this.client)
    this.chatManager.registerEvents(this.client)
    this.commandsManager.registerEvents(this.client)
    this.loggerManager.registerEvents(this.client)

    await this.client.login(this.config.key)
  }

  async disconnect(): Promise<void> {
    await this.client.destroy()
    this.setAndBroadcastNewStatus(Status.Ended, 'discord instance has disconnected')
  }
}
