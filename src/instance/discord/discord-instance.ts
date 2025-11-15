import assert from 'node:assert'

import type { Guild, GuildMember, Snowflake, User } from 'discord.js'
import { Client, GatewayIntentBits, Options, Partials } from 'discord.js'

import type { StaticDiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { InstanceType, Permission } from '../../common/application-event.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import type { DiscordProfile } from '../../common/user'

import ChatManager from './chat-manager.js'
import { CommandManager } from './command-manager.js'
import MessageAssociation from './common/message-association.js'
import DiscordBridge from './discord-bridge.js'
import Leaderboard from './features/leaderboard.js'
import LoggerManager from './features/logger-manager.js'
import EmojiHandler from './handlers/emoji-handler.js'
import StateHandler from './handlers/state-handler.js'
import StatusHandler from './handlers/status-handler.js'

export default class DiscordInstance extends ConnectableInstance<InstanceType.Discord> {
  readonly commandsManager: CommandManager
  readonly leaderboard: Leaderboard

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
      this.messageAssociation,
      this.eventHelper,
      this.logger,
      this.errorHandler
    )
    this.commandsManager = new CommandManager(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    this.loggerManager = new LoggerManager(this.application, this, this.eventHelper, this.logger, this.errorHandler)
    this.leaderboard = new Leaderboard(this.application, this, this.eventHelper, this.logger, this.errorHandler)

    this.bridge = new DiscordBridge(
      this.application,
      this,
      this.messageAssociation,
      this.logger,
      this.errorHandler,
      this.staticConfig
    )
  }

  public profileById(userId: Snowflake, guild: Guild | undefined): DiscordProfile | undefined {
    const user = this.client.users.cache.get(userId)
    if (user !== undefined) return this.profileByUser(user, guild?.members.cache.get(userId))

    return undefined
  }

  public profileByUser(user: User, guildMember: GuildMember | undefined): DiscordProfile {
    return {
      id: user.id,
      displayName:
        this.cleanUsername(guildMember?.displayName) ??
        this.cleanUsername(user.username) ??
        this.cleanUsername(user.displayName) ??
        user.id,
      avatar: guildMember?.avatarURL() ?? user.avatarURL() ?? undefined
    }
  }

  private cleanUsername(username: string | undefined): string | undefined {
    if (username === undefined) return undefined

    // clear all non ASCII characters
    // eslint-disable-next-line no-control-regex
    username = username.replaceAll(/[^\u0000-\u007F]/g, '')

    username = username.trim().slice(0, 16)

    if (/^\w+$/.test(username)) return username
    if (username.includes(' ')) return username.split(' ')[0]
    return undefined
  }

  public resolvePermission(userId: string): Permission {
    assert.strictEqual(this.currentStatus(), Status.Connected)
    assert.ok(this.client.isReady())

    if (this.staticConfig.adminIds.includes(userId)) return Permission.Admin

    let highestPermission = Permission.Anyone
    for (const guild of this.client.guilds.cache.values()) {
      const guildMember = guild.members.cache.get(userId)
      if (guildMember === undefined) continue
      const permissionLevel = this.resolvePrivilegeLevel(guildMember.roles.cache.keys().toArray())
      if (permissionLevel > highestPermission) highestPermission = permissionLevel
    }

    return highestPermission
  }

  private resolvePrivilegeLevel(roles: string[]): Permission {
    const config = this.application.core.discordConfigurations
    if (roles.some((role) => config.getOfficerRoleIds().includes(role))) {
      return Permission.Officer
    }

    if (roles.some((role) => config.getHelperRoleIds().includes(role))) {
      return Permission.Helper
    }

    return Permission.Anyone
  }

  public getStaticConfig(): Readonly<StaticDiscordConfig> {
    return this.staticConfig
  }

  async connect(): Promise<void> {
    assert.ok(this.staticConfig.key)

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
    this.leaderboard.registerEvents(this.client)
    this.loggerManager.registerEvents(this.client)

    await this.client.login(this.staticConfig.key)
  }

  async disconnect(): Promise<void> {
    await this.client.destroy()
    this.setAndBroadcastNewStatus(Status.Ended, 'discord instance has disconnected')
  }
}
