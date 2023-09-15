import fs = require('fs')
import { TypedEmitter } from 'tiny-typed-emitter'
import { Client as HypixelClient } from 'hypixel-api-reborn'
import DiscordInstance from './instance/discord/DiscordInstance'
import MinecraftInstance from './instance/minecraft/MinecraftInstance'
import GlobalChatInstance from './instance/globalChat/GlobalChatInstance'
import WebhookInstance from './instance/webhook/WebhookInstance'
import { PunishedUsers } from './util/PunishedUsers'
import {
  ChatEvent,
  ClientEvent,
  CommandEvent,
  InstanceEvent,
  InstanceRestartSignal,
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
import * as Events from 'events'
import { getLogger, Logger } from 'log4js'
import { ApplicationConfig } from './ApplicationConfig'
import SocketInstance from './instance/socket/SocketInstance'
import * as path from 'path'
import { MojangApi } from './util/Mojang'

export default class Application extends TypedEmitter<ApplicationEvents> {
  private readonly logger: Logger
  private readonly instances: Array<ClientInstance<any>> = []
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

    let discordInstance: DiscordInstance | null = null
    if (this.config.discord.key != null) {
      discordInstance = new DiscordInstance(this, this.config.discord.instanceName, this.config.discord)
      this.instances.push(discordInstance)
    }

    for (const instanceConfig of this.config.webhooks) {
      this.instances.push(
        new WebhookInstance(
          this,
          instanceConfig.instanceName,
          discordInstance != null ? discordInstance.client : null,
          instanceConfig
        )
      )
    }

    if (this.config.global.enabled) {
      this.instances.push(new GlobalChatInstance(this, this.config.global.instanceName, this.config.global))
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
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(f).default
      })
    } else {
      this.plugins = []
    }

    this.on('shutdownSignal', (event) => {
      if (event.targetInstanceName === null) {
        this.logger.info('Shutdown signal has been received. Shutting down this node.')
        this.logger.info('Node should auto restart if a process monitor service is used.')
        this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')

        void new Promise((resolve) => setTimeout(resolve, 5000)).then(() => {
          process.exit(2)
        })
      }
    })
  }

  async sendConnectSignal(): Promise<void> {
    this.broadcastLocalInstances()

    this.logger.debug('Sending signal to all plugins')
    this.plugins.forEach((p) => {
      p.onRun({
        application: this,
        config: this.config.plugins,
        // only shared with plugins to directly modify instances
        // everything else is encapsulated
        getLocalInstance: (instanceName: string) => this.instances.find((i) => i.instanceName === instanceName)
      })
    })

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
  const old = emitter.emit
  emitter.emit = (event: string, ...args: Parameters<any>): boolean => {
    if (event !== '*') emitter.emit('*', event, ...args)
    return old.call(emitter, event, ...args)
  }
}

export interface ApplicationEvents {
  /**
   * Receive all events
   * @param event event name
   * @param args event arguments
   */
  '*': (event: string, ...args: any) => void

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
  restartSignal: (event: InstanceRestartSignal) => void

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
