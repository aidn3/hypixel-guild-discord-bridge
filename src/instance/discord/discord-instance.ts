import assert from 'node:assert'

import { Client, GatewayIntentBits, Options, Partials } from 'discord.js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ClientInstance, Status } from '../../common/client-instance.js'

import BridgeHandler from './bridge-handler.js'
import ChatManager from './chat-manager.js'
import { CommandManager } from './command-manager.js'
import StateHandler from './handlers/state-handler.js'
import StatusHandler from './handlers/status-handler.js'

export default class DiscordInstance extends ClientInstance<DiscordConfig> {
  private readonly stateHandler: StateHandler
  private readonly statusHandler: StatusHandler
  private readonly chatManager: ChatManager
  readonly commandsManager: CommandManager
  readonly client: Client
  private connected = false

  constructor(app: Application, instanceName: string, config: DiscordConfig) {
    super(app, instanceName, InstanceType.Discord, config)
    this.status = Status.Fresh

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

    this.stateHandler = new StateHandler(this)
    this.statusHandler = new StatusHandler(this)
    this.chatManager = new ChatManager(this)
    this.commandsManager = new CommandManager(this)

    if (this.config.publicChannelIds.length === 0) {
      this.logger.info('no Discord public channels found')
    }

    if (this.config.officerChannelIds.length === 0) {
      this.logger.info('no Discord officer channels found')
    }

    if (this.config.officerRoleIds.length === 0) {
      this.logger.info('no Discord officer roles found')
    }

    new BridgeHandler(app, this)
  }

  async connect(): Promise<void> {
    assert(this.config.key)

    if (this.connected) {
      this.logger.error('Instance already connected once. Calling connect() again will bug it. Returning...')
      return
    }
    this.connected = true

    this.stateHandler.registerEvents()
    this.statusHandler.registerEvents()
    this.chatManager.registerEvents()
    this.commandsManager.registerEvents()

    await this.client.login(this.config.key)
  }
}
