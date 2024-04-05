import type Events from 'node:events'
import path from 'node:path'

import BadWords from 'bad-words'
import { Client as HypixelClient } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'
import { getLogger } from 'log4js'
import { TypedEmitter } from 'tiny-typed-emitter'

import type { ApplicationConfig } from './application-config'
import ClusterHelper from './cluster-helper'
import type {
  BaseEvent,
  ChatEvent,
  ClientEvent,
  CommandEvent,
  InstanceEvent,
  InstanceSelfBroadcast,
  MinecraftRawChatEvent,
  MinecraftSelfBroadcast,
  MinecraftSendChat,
  PunishmentAddEvent,
  PunishmentForgiveEvent,
  ReconnectSignal,
  ShutdownSignal
} from './common/application-event'
import { InstanceType } from './common/application-event'
import type { ClientInstance } from './common/client-instance'
import { INTERNAL_INSTANCE_PREFIX } from './common/client-instance'
import type { PluginInterface } from './common/plugins'
import { CommandsInstance } from './instance/commands/commands-instance'
import DiscordInstance from './instance/discord/discord-instance'
import LoggerInstance from './instance/logger/logger-instance'
import MetricsInstance from './instance/metrics/metrics-instance'
import MinecraftInstance from './instance/minecraft/minecraft-instance'
import SocketInstance from './instance/socket/socket-instance'
import { MojangApi } from './util/mojang'
import { PunishedUsers } from './util/punished-users'
import { shutdownApplication, sleep } from './util/shared-util'

export default class Application extends TypedEmitter<ApplicationEvents> {
  private readonly logger: Logger
  private readonly configsDirectory
  private readonly config: ApplicationConfig

  private readonly plugins: { plugin: PluginInterface; name: string }[] = []

  readonly commandsInstance: CommandsInstance | undefined
  readonly discordInstance: DiscordInstance | undefined
  private readonly loggerInstances: LoggerInstance[] = []
  private readonly metricsInstance: MetricsInstance | undefined
  private readonly minecraftInstances: MinecraftInstance[] = []
  private readonly socketInstance: SocketInstance | undefined

  readonly clusterHelper: ClusterHelper
  readonly punishedUsers: PunishedUsers
  readonly profanityFilter: BadWords.BadWords

  readonly hypixelApi: HypixelClient
  readonly mojangApi: MojangApi

  constructor(config: ApplicationConfig, configsDirectory: string) {
    super()
    this.logger = getLogger('Application')
    this.logger.trace('Application initiating')
    emitAll(this) // first thing to redirect all events
    this.config = config
    this.configsDirectory = configsDirectory

    this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {
      cache: true,
      cacheTime: 300
    })
    this.mojangApi = new MojangApi()
    this.punishedUsers = new PunishedUsers(this)
    this.clusterHelper = new ClusterHelper(this)

    this.profanityFilter = new BadWords({
      emptyList: !this.config.profanity.enabled
    })
    this.profanityFilter.removeWords(...this.config.profanity.whitelisted)

    this.discordInstance =
      this.config.discord.key == undefined
        ? undefined
        : new DiscordInstance(this, this.config.discord.instanceName, this.config.discord)

    for (let index = 0; index < this.config.loggers.length; index++) {
      this.loggerInstances.push(
        new LoggerInstance(
          this,
          INTERNAL_INSTANCE_PREFIX + InstanceType.Logger + '-' + (index + 1),
          this.config.loggers[index]
        )
      )
    }

    for (const instanceConfig of this.config.minecraft.instances) {
      this.minecraftInstances.push(
        new MinecraftInstance(this, instanceConfig.instanceName, instanceConfig, this.config.minecraft.bridgePrefix)
      )
    }

    this.metricsInstance = this.config.metrics.enabled
      ? new MetricsInstance(this, INTERNAL_INSTANCE_PREFIX + InstanceType.METRICS, this.config.metrics)
      : undefined

    this.socketInstance = this.config.socket.enabled
      ? new SocketInstance(this, INTERNAL_INSTANCE_PREFIX + InstanceType.SOCKET, this.config.socket)
      : undefined

    this.commandsInstance = this.config.commands.enabled
      ? new CommandsInstance(this, INTERNAL_INSTANCE_PREFIX + InstanceType.COMMANDS, this.config.commands)
      : undefined

    this.plugins = this.loadPlugins()

    this.on('shutdownSignal', (event) => {
      if (event.targetInstanceName === undefined) {
        this.logger.info('Shutdown signal has been received. Shutting down this node.')
        if (event.restart) {
          this.logger.info('Node should auto restart if a process monitor service is used.')
        }

        this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')
        void sleep(5000).then(() => {
          shutdownApplication(2)
        })
      }
    })
  }

  public getConfigFilePath(filename: string): string {
    return path.resolve(this.configsDirectory, path.basename(filename))
  }

  private loadPlugins(): { plugin: PluginInterface; name: string }[] {
    // eslint-disable-next-line unicorn/prefer-module
    const mainPath = require.main?.path ?? process.cwd()
    this.logger.debug(`Loading plugins with main path as: ${mainPath}`)
    return this.config.plugins
      .map((p) => (path.isAbsolute(p) ? p : path.resolve(mainPath, p)))
      .map((f) => {
        const relativePath = path.relative(mainPath, f)
        this.logger.debug(`Loading Plugin ${relativePath}`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires,unicorn/prefer-module
        const importedPlugin: { default: PluginInterface } = require(f) as { default: PluginInterface }
        return { plugin: importedPlugin.default, name: relativePath }
      })
  }

  async sendConnectSignal(): Promise<void> {
    this.syncBroadcast()

    this.logger.debug('Sending signal to all plugins')
    for (const p of this.plugins) {
      p.plugin.onRun({
        logger: getLogger(`plugin-${p.name}`),
        application: this,
        // only shared with plugins to directly modify instances
        // everything else is encapsulated
        localInstances: this.getAllInstances(),

        addChatCommand: this.commandsInstance ? (command) => this.commandsInstance?.commands.push(command) : undefined,
        addDiscordCommand: this.discordInstance
          ? (command) => this.discordInstance?.commandsManager.commands.set(command.getCommandBuilder().name, command)
          : undefined
      })
    }

    for (const instance of this.getAllInstances()) {
      this.logger.debug(`Connecting instance ${instance.instanceName}`)
      await instance.connect()
    }
  }

  public syncBroadcast(): void {
    this.logger.debug('Informing instances of each other')
    for (const instance of this.getAllInstances()) {
      this.emit('selfBroadcast', {
        localEvent: true,
        instanceName: instance.instanceName,
        instanceType: instance.instanceType
      })
    }

    this.logger.debug('Broadcasting all Minecraft bots')
    for (const minecraftBot of this.clusterHelper.getMinecraftBots()) {
      minecraftBot.localEvent = true
      this.emit('minecraftSelfBroadcast', minecraftBot)
    }

    this.logger.debug('Broadcasting all punishments')
    for (const punishment of this.punishedUsers.getAllPunishments()) {
      punishment.localEvent = true
      this.emit('punishmentAdd', punishment)
    }
  }

  private getAllInstances(): ClientInstance<unknown>[] {
    return [
      ...this.loggerInstances, // loggers first to catch any connecting events and log them as well
      this.discordInstance, // discord second to send any notification about connecting

      this.metricsInstance,
      this.commandsInstance,
      ...this.minecraftInstances,

      this.socketInstance // socket last. so other instances are ready when connecting to other clients
    ].filter((instance) => instance != undefined) as ClientInstance<unknown>[]
  }
}

function emitAll(emitter: Events): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const old = emitter.emit
  emitter.emit = (event: string, ...arguments_): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (event !== '*') emitter.emit('*', event, ...arguments_)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return old.call(emitter, event, ...arguments_)
  }
}

export interface ApplicationEvents {
  /**
   * Receive all events
   * @param name event name
   * @param event event object
   */
  '*': <T extends BaseEvent>(name: string, event: T) => void

  /**
   * User sending messages
   */
  chat: (event: ChatEvent) => void
  /**
   * User join/leave/offline/online/mute/kick/etc
   */
  event: (event: ClientEvent) => void
  /**
   * User executing a command
   */
  command: (event: CommandEvent) => void

  /**
   * Internal instance start/connect/disconnect/etc
   */
  instance: (event: InstanceEvent) => void
  /**
   * Broadcast instance to inform other applications nodes in cluster about its existence
   */
  selfBroadcast: (event: InstanceSelfBroadcast) => void

  /**
   *  Broadcast any punishment to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentAdd: (event: PunishmentAddEvent) => void
  /**
   *  Broadcast any punishment forgiveness to other instances. Such as mute, ban, etc.
   *  This is an internal event and shouldn't be sent by anyone except the internal punishment-system
   *  @internal
   */
  punishmentForgive: (event: PunishmentForgiveEvent) => void

  /**
   * Command used to restart an instance.
   * Note: This is currently only registered in Minecraft instances
   */
  reconnectSignal: (event: ReconnectSignal) => void
  /**
   * Command used to shut down the bridge.
   * It will take some time for the bridge to shut down.
   * Bridge will auto restart if a service monitor is used.
   */
  shutdownSignal: (event: ShutdownSignal) => void

  /**
   * Used to broadcast which in-game username/uuid belongs to which bot.
   * Useful to distinguish in-game between players and bots
   */
  minecraftSelfBroadcast: (event: MinecraftSelfBroadcast) => void
  /**
   * Minecraft instance raw chat
   */
  minecraftChat: (event: MinecraftRawChatEvent) => void
  /**
   * Command used to send a chat message/command through a minecraft instance
   */
  minecraftSend: (event: MinecraftSendChat) => void
}
