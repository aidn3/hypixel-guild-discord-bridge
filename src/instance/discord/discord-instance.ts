import assert from 'node:assert'

import { Client, GatewayIntentBits, Options, Partials } from 'discord.js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'

import ChatManager from './chat-manager.js'
import { CommandManager } from './command-manager.js'
import DiscordBridge from './discord-bridge.js'
import StateHandler from './handlers/state-handler.js'
import StatusHandler from './handlers/status-handler.js'

export default class DiscordInstance extends ClientInstance<DiscordConfig> {
  readonly commandsManager: CommandManager
  readonly client: Client

  private readonly stateHandler: StateHandler
  private readonly statusHandler: StatusHandler
  private readonly chatManager: ChatManager

  private readonly bridge: DiscordBridge
  private connected = false

  constructor(app: Application, instanceName: string, config: DiscordConfig) {
    super(app, instanceName, InstanceType.Discord, config)

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

    this.stateHandler = new StateHandler(this.application, this, this.logger, this.errorHandler)
    this.statusHandler = new StatusHandler(this.application, this, this.logger, this.errorHandler)
    this.chatManager = new ChatManager(this.application, this, this.logger, this.errorHandler, this.config)
    this.commandsManager = new CommandManager(this.application, this, this.logger, this.errorHandler, this.config)

    this.bridge = new DiscordBridge(this.application, this, this.logger, this.errorHandler, this.config)

    if (this.config.publicChannelIds.length === 0) {
      this.logger.info('no Discord public channels found')
    }
    if (this.config.officerChannelIds.length === 0) {
      this.logger.info('no Discord officer channels found')
    }
    if (this.config.officerRoleIds.length === 0) {
      this.logger.info('no Discord officer roles found')
    }
  }

  async connect(): Promise<void> {
    assert(this.config.key)

    if (this.connected) {
      this.logger.error('Instance already connected once. Calling connect() again will bug it. Returning...')
      return
    }
    this.connected = true

    this.setAndBroadcastNewStatus(Status.Connecting, 'Discord connecting')

    this.stateHandler.registerEvents()
    this.statusHandler.registerEvents()
    this.chatManager.registerEvents()
    this.commandsManager.registerEvents()

    await this.client.login(this.config.key)
  }
}
