import fs = require('fs')
import * as Events from 'node:events'
import * as path from 'node:path'
import { TypedEmitter } from 'tiny-typed-emitter'
import { Client as HypixelClient } from 'hypixel-api-reborn'
import { getLogger, Logger } from 'log4js'
import DiscordInstance from './instance/discord/DiscordInstance'
import MinecraftInstance from './instance/minecraft/MinecraftInstance'
import WebhookInstance from './instance/webhook/WebhookInstance'
import { PunishedUsers } from './util/PunishedUsers'
import {
  ChatEvent,
  ClientEvent,
  CommandEvent,
  InstanceEvent,
  ReconnectSignal,
  InstanceSelfBroadcast,
  MinecraftCommandResponse,
  MinecraftRawChatEvent,
  MinecraftSelfBroadcast,
  MinecraftSendChat,
  ShutdownSignal
} from './common/ApplicationEvent'
import { ClientInstance } from './common/ClientInstance'
import { PluginInterface } from './common/Plugins'
import MetricsInstance from './instance/metrics/MetricsInstance'
import ClusterHelper from './ClusterHelper'
import { ApplicationConfig } from './ApplicationConfig'
import SocketInstance from './instance/socket/SocketInstance'
import { MojangApi } from './util/Mojang'

export default class Application extends TypedEmitter<ApplicationEvents> {
  private readonly logger: Logger
  private readonly instances: ClientInstance<unknown>[] = []
  private readonly plugins: PluginInterface[] = []

  readonly clusterHelper: ClusterHelper
  readonly punishedUsers: PunishedUsers
  readonly hypixelApi: HypixelClient
  readonly mojangApi: MojangApi
  readonly config: ApplicationConfig

  constructor(config: ApplicationConfig) {
    super()
    this.logger = getLogger('Application')
    this.logger.trace('Application initiating')
    emitAll(this) // first thing to redirect all events
    this.config = config

    this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {
      cache: true,
      cacheTime: 300
    })
    this.mojangApi = new MojangApi()
    this.punishedUsers = new PunishedUsers()
    this.clusterHelper = new ClusterHelper(this)

    let discordInstance: DiscordInstance | undefined
    if (this.config.discord.key != undefined) {
      discordInstance = new DiscordInstance(this, this.config.discord.instanceName, this.config.discord)
      this.instances.push(discordInstance)
    }

    for (const instanceConfig of this.config.webhooks) {
      this.instances.push(
        new WebhookInstance(this, instanceConfig.instanceName, discordInstance?.client, instanceConfig)
      )
    }

    for (const instanceConfig of this.config.minecrafts) {
      this.instances.push(new MinecraftInstance(this, instanceConfig.instanceName, instanceConfig))
    }

    if (this.config.metrics.enabled) {
      this.instances.push(new MetricsInstance(this, this.config.metrics.instanceName, this.config.metrics))
    }

    if (this.config.socket.enabled) {
      this.instances.push(new SocketInstance(this, this.config.socket.instanceName, this.config.socket))
    }

    if (this.config.plugins.enabled) {
      // eslint-disable-next-line unicorn/prefer-module
      const mainPath = require.main?.path ?? process.cwd()
      this.logger.debug(`Loading plugins with main path as: ${mainPath}`)
      let paths

      // check strictly for undefined key
      if (this.config.plugins.paths === undefined) {
        this.logger.warn(
          'Plugins config is old. Resolving default plugins. See config_example.yaml for the latest config scheme'
        )
        paths = fs
          .readdirSync('./src/plugins/')
          .filter((file) => file.endsWith('Plugin.ts'))
          .map((f) => path.resolve(mainPath, 'src/plugins', f))
      } else {
        paths = this.config.plugins.paths.map((p) => (path.isAbsolute(p) ? p : path.resolve(mainPath, p)))
      }

      this.plugins = paths.map((f) => {
        this.logger.debug(`Loading Plugin ${path.relative(mainPath, f)}`)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-var-requires,unicorn/prefer-module
        return require(f).default as PluginInterface
      })
    } else {
      this.plugins = []
    }

    this.on('shutdownSignal', (event) => {
      if (event.targetInstanceName === undefined) {
        this.logger.info('Shutdown signal has been received. Shutting down this node.')
        if (event.restart) {
          this.logger.info('Node should auto restart if a process monitor service is used.')
        }
        this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')

        void new Promise((resolve) => setTimeout(resolve, 5000)).then(() => {
          // eslint-disable-next-line unicorn/no-process-exit
          process.exit(2)
        })
      }
    })
  }

  async sendConnectSignal(): Promise<void> {
    this.broadcastLocalInstances()

    this.logger.debug('Sending signal to all plugins')
    for (const p of this.plugins) {
      p.onRun({
        application: this,
        config: this.config.plugins,
        // only shared with plugins to directly modify instances
        // everything else is encapsulated
        getLocalInstance: (instanceName: string) => this.instances.find((index) => index.instanceName === instanceName)
      })
    }

    for (const instance of this.instances) {
      this.logger.debug(`Connecting instance ${instance.instanceName}`)
      await instance.connect()
    }
  }

  public broadcastLocalInstances(): void {
    this.logger.debug('Informing instances of each other')

    for (const instance of this.instances) {
      this.emit('selfBroadcast', {
        localEvent: true,
        instanceName: instance.instanceName,
        location: instance.location
      })
    }
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
   * @param event event name
   * @param args event arguments
   */
  '*': (event: string, ...arguments_: unknown[]) => void

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

  /**
   * Response of an executed command from minecraft instance
   */
  minecraftCommandResponse: (event: MinecraftCommandResponse) => void
}
