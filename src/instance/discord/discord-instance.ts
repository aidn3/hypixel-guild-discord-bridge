import assert from 'node:assert'

import { Client, GatewayIntentBits, Options, Partials } from 'discord.js'

import type { StaticDiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType, Permission } from '../../common/application-event.js'
import { ConfigManager } from '../../common/config-manager.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'

import ChatManager from './chat-manager.js'
import { CommandManager } from './command-manager.js'
import type { DiscordConfig } from './common/discord-config.js'
import MessageAssociation from './common/message-association.js'
import DiscordBridge from './discord-bridge.js'
import LoggerManager from './features/logger-manager.js'
import EmojiHandler from './handlers/emoji-handler.js'
import StateHandler from './handlers/state-handler.js'
import StatusHandler from './handlers/status-handler.js'

export default class DiscordInstance extends ConnectableInstance<InstanceType.Discord> {
  readonly commandsManager: CommandManager
  private readonly config: ConfigManager<DiscordConfig>
  private readonly client: Client

  private readonly stateHandler: StateHandler
  private readonly statusHandler: StatusHandler
  private readonly emojiHandler: EmojiHandler
  private readonly chatManager: ChatManager
  private readonly loggerManager: LoggerManager

  private readonly bridge: DiscordBridge
  private readonly messageAssociation: MessageAssociation = new MessageAssociation()

  private readonly staticConfig: Readonly<StaticDiscordConfig>
  private connected = false

  constructor(app: Application, config: StaticDiscordConfig) {
    super(app, InstanceType.Discord, InstanceType.Discord)

    this.staticConfig = config
    this.config = new ConfigManager(app, app.getConfigFilePath('discord.json'), {
      publicChannelIds: [],
      officerChannelIds: [],
      helperRoleIds: [],
      officerRoleIds: [],

      loggerChannelIds: [],

      alwaysReplyReaction: false,
      enforceVerification: false,

      guildOnline: true,
      guildOffline: true
    })

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
    this.emojiHandler = new EmojiHandler(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    this.chatManager = new ChatManager(
      this.application,
      this,
      this.config,
      this.messageAssociation,
      this.eventHelper,
      this.logger,
      this.errorHandler
    )
    this.commandsManager = new CommandManager(
      this.application,
      this,
      this.config,
      this.eventHelper,
      this.logger,
      this.errorHandler
    )
    this.loggerManager = new LoggerManager(
      this.application,
      this,
      this.config,
      this.eventHelper,
      this.logger,
      this.errorHandler
    )

    this.bridge = new DiscordBridge(
      this.application,
      this,
      this.config,
      this.messageAssociation,
      this.logger,
      this.errorHandler,
      this.staticConfig
    )
  }

  public resolvePrivilegeLevel(userId: string, roles: string[]): Permission {
    if (this.staticConfig.adminIds.includes(userId)) return Permission.Admin

    if (roles.some((role) => this.config.data.officerRoleIds.includes(role))) {
      return Permission.Officer
    }

    if (roles.some((role) => this.config.data.helperRoleIds.includes(role))) {
      return Permission.Helper
    }

    return Permission.Anyone
  }

  public getConfig(): ConfigManager<DiscordConfig> {
    return this.config
  }

  public getStaticConfig(): Readonly<StaticDiscordConfig> {
    return this.staticConfig
  }

  async connect(): Promise<void> {
    assert(this.staticConfig.key)

    if (this.connected) {
      this.logger.error('Instance already connected once. Calling connect() again will bug it. Returning...')
      return
    }
    this.connected = true

    this.setAndBroadcastNewStatus(Status.Connecting, 'Discord connecting')

    this.stateHandler.registerEvents(this.client)
    this.statusHandler.registerEvents(this.client)
    this.emojiHandler.registerEvents(this.client)
    this.chatManager.registerEvents(this.client)
    this.commandsManager.registerEvents(this.client)
    this.loggerManager.registerEvents(this.client)

    await this.client.login(this.staticConfig.key)
  }

  async disconnect(): Promise<void> {
    await this.client.destroy()
    this.setAndBroadcastNewStatus(Status.Ended, 'discord instance has disconnected')
  }
}
