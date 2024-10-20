import type Events from 'node:events'
import path from 'node:path'
import * as process from 'node:process'

import BadWords from 'bad-words'
import { Client as HypixelClient } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'
import Logger4js from 'log4js'
import { TypedEmitter } from 'tiny-typed-emitter'

import type { ApplicationConfig } from './application-config.js'
import ClusterHelper from './cluster-helper.js'
import type { ApplicationEvents } from './common/application-event.js'
import { InstanceType } from './common/application-event.js'
import type { ClientInstance } from './common/client-instance.js'
import { InternalInstancePrefix } from './common/client-instance.js'
import type { PluginInterface } from './common/plugins.js'
import { CommandsInstance } from './instance/commands/commands-instance.js'
import DiscordInstance from './instance/discord/discord-instance.js'
import LoggerInstance from './instance/logger/logger-instance.js'
import MetricsInstance from './instance/metrics/metrics-instance.js'
import MinecraftInstance from './instance/minecraft/minecraft-instance.js'
import PunishmentsInstance from './instance/punishments/punishments-instance.js'
import SocketInstance from './instance/socket/socket-instance.js'
import { MojangApi } from './util/mojang.js'
import { shutdownApplication, sleep } from './util/shared-util.js'

export default class Application extends TypedEmitter<ApplicationEvents> {
  private readonly logger: Logger
  private readonly configsDirectory
  private readonly config: ApplicationConfig

  private readonly plugins: { promise: Promise<PluginInterface>; originalPath: string; name: string }[] = []

  readonly commandsInstance: CommandsInstance | undefined
  readonly discordInstance: DiscordInstance | undefined
  private readonly loggerInstances: LoggerInstance[] = []
  private readonly metricsInstance: MetricsInstance | undefined
  private readonly minecraftInstances: MinecraftInstance[] = []
  private readonly socketInstance: SocketInstance | undefined

  readonly clusterHelper: ClusterHelper
  readonly punishmentsSystem: PunishmentsInstance
  readonly profanityFilter: BadWords.BadWords

  readonly hypixelApi: HypixelClient
  readonly mojangApi: MojangApi

  constructor(config: ApplicationConfig, rootDirectory: string, configsDirectory: string) {
    super()
    // eslint-disable-next-line import/no-named-as-default-member
    this.logger = Logger4js.getLogger('Application')
    this.logger.trace('Application initiating')
    emitAll(this) // first thing to redirect all events
    this.config = config
    this.configsDirectory = configsDirectory

    this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {
      cache: true,
      mojangCacheTime: 300,
      hypixelCacheTime: 300
    })
    this.mojangApi = new MojangApi()
    this.punishmentsSystem = new PunishmentsInstance(this, this.mojangApi)
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
          `${InternalInstancePrefix}${InstanceType.Logger}-${index + 1}`,
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
      ? new MetricsInstance(this, InternalInstancePrefix + InstanceType.Metrics, this.config.metrics)
      : undefined

    this.socketInstance = this.config.socket.enabled
      ? new SocketInstance(this, InternalInstancePrefix + InstanceType.Socket, this.config.socket)
      : undefined

    this.commandsInstance = this.config.commands.enabled
      ? new CommandsInstance(this, InternalInstancePrefix + InstanceType.Commands, this.config.commands)
      : undefined

    this.plugins = this.loadPlugins(rootDirectory)

    this.on('shutdownSignal', (event) => {
      if (event.targetInstanceName === undefined) {
        this.logger.info('Shutdown signal has been received. Shutting down this node.')
        if (event.restart) {
          this.logger.info('Node should auto restart if a process monitor service is used.')
        }

        this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')
        void sleep(5000).then(() => {
          void shutdownApplication(2)
        })
      }
    })
  }

  public getConfigFilePath(filename: string): string {
    return path.resolve(this.configsDirectory, path.basename(filename))
  }

  public filterProfanity(message: string): { filteredMessage: string; changed: boolean } {
    let filtered: string
    try {
      filtered = this.profanityFilter.clean(message)
    } catch {
      /*
          profanity package has bug.
          will throw error if given one special character.
          example: clean("?")
          message is clear if thrown
        */
      filtered = message
    }

    return { filteredMessage: filtered, changed: message !== filtered }
  }

  private loadPlugins(
    rootDirectory: string
  ): { promise: Promise<PluginInterface>; originalPath: string; name: string }[] {
    const result: { promise: Promise<PluginInterface>; originalPath: string; name: string }[] = []

    for (const pluginPath of this.config.plugins) {
      let newPath: string = path.resolve(rootDirectory, pluginPath)
      if (process.platform === 'win32' && !newPath.startsWith('file:///')) {
        newPath = `file:///${newPath}`
      }

      result.push({
        promise: import(newPath).then((resolved: { default: PluginInterface }) => resolved.default),
        originalPath: pluginPath,
        name: path.basename(pluginPath)
      })
    }

    return result
  }

  async sendConnectSignal(): Promise<void> {
    this.logger.debug('Sending signal to all plugins')
    for (const p of this.plugins) {
      this.logger.debug(`Loading Plugin ${p.originalPath}`)
      const loadedPlugin = await p.promise
      loadedPlugin.onRun({
        // eslint-disable-next-line import/no-named-as-default-member
        logger: Logger4js.getLogger(`plugin-${p.name}`),
        pluginName: p.name,
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

    this.syncBroadcast()

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
    for (const punishment of this.punishmentsSystem.punishments.all()) {
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

/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
function emitAll(emitter: Events): void {
  const old = emitter.emit
  emitter.emit = (event: string, ...callerArguments): boolean => {
    if (event !== '*') emitter.emit('*', event, ...callerArguments)
    return old.call(emitter, event, ...callerArguments)
  }
}
/* eslint-enable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
