/* eslint @typescript-eslint/explicit-member-accessibility: "error" */
// @typescript-eslint/explicit-member-accessibility needed since this is part of the public api

import type Events from 'node:events'
import path from 'node:path'
import * as process from 'node:process'

import { Client as HypixelClient } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'
import Logger4js from 'log4js'
import { TypedEmitter } from 'tiny-typed-emitter'

import type { ApplicationConfig } from './application-config.js'
import ClusterHelper from './cluster-helper.js'
import type { ApplicationEvents, InstanceIdentifier } from './common/application-event.js'
import { InstanceType } from './common/application-event.js'
import { ConnectableInstance } from './common/connectable-instance.js'
import type { Instance } from './common/instance.js'
import { InternalInstancePrefix } from './common/instance.js'
import type { AddChatCommand, AddDiscordCommand } from './common/plugin-instance.js'
import PluginInstance from './common/plugin-instance.js'
import UnexpectedErrorHandler from './common/unexpected-error-handler.js'
import { CommandsInstance } from './instance/commands/commands-instance.js'
import DiscordInstance from './instance/discord/discord-instance.js'
import LoggerInstance from './instance/logger/logger-instance.js'
import MetricsInstance from './instance/metrics/metrics-instance.js'
import MinecraftInstance from './instance/minecraft/minecraft-instance.js'
import ModerationInstance from './instance/moderation/moderation-instance.js'
import SocketInstance from './instance/socket/socket-instance.js'
import ApplicationIntegrity from './util/application-integrity.js'
import Autocomplete from './util/autocomplete.js'
import { MojangApi } from './util/mojang.js'
import { gracefullyExitProcess, sleep } from './util/shared-util.js'

export default class Application extends TypedEmitter<ApplicationEvents> implements InstanceIdentifier {
  public readonly instanceName: string = InstanceType.Main
  public readonly instanceType: InstanceType = InstanceType.Main

  public readonly clusterHelper: ClusterHelper
  public readonly autoComplete: Autocomplete
  public readonly applicationIntegrity: ApplicationIntegrity
  public readonly moderation: ModerationInstance

  public readonly hypixelApi: HypixelClient
  public readonly mojangApi: MojangApi

  private readonly logger: Logger
  private readonly errorHandler: UnexpectedErrorHandler

  private readonly configsDirectory
  private readonly config: ApplicationConfig

  private readonly plugins: { promise: Promise<PluginInterface>; originalPath: string; name: string }[] = []

  private readonly commandsInstance: CommandsInstance | undefined
  private readonly discordInstance: DiscordInstance | undefined
  private readonly loggerInstances: LoggerInstance[] = []
  private readonly metricsInstance: MetricsInstance | undefined
  private readonly minecraftInstances: MinecraftInstance[] = []
  private readonly socketInstance: SocketInstance | undefined

  public constructor(config: ApplicationConfig, rootDirectory: string, configsDirectory: string) {
    super()
    // eslint-disable-next-line import/no-named-as-default-member
    this.logger = Logger4js.getLogger('Application')
    this.errorHandler = new UnexpectedErrorHandler(this.logger)
    this.logger.trace('Application initiating')

    this.applicationIntegrity = new ApplicationIntegrity(this)
    // only check for integrity if this application is the main one that distributes events
    // applications cross-sockets only have to worry about themselves
    this.applicationIntegrity.enableRemoteEventsIntegrity(config.socket.enabled && config.socket.type === 'server')
    this.applicationIntegrity.addLocalInstance(this)

    emitAll(this, this.applicationIntegrity) // first thing to redirect all events
    this.config = config
    this.configsDirectory = configsDirectory

    this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {
      cache: true,
      mojangCacheTime: 300,
      hypixelCacheTime: 300
    })
    this.mojangApi = new MojangApi()
    this.moderation = new ModerationInstance(this, this.mojangApi, config.moderation)
    this.clusterHelper = new ClusterHelper(this)
    this.autoComplete = new Autocomplete(this)

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

    this.loadPlugins(rootDirectory)

    this.on('shutdownSignal', (event) => {
      if (event.targetInstanceName === undefined) {
        this.logger.info('Shutdown signal has been received. Shutting down this node.')
        if (event.restart) {
          this.logger.info('Node should auto restart if a process monitor service is used.')
        }

        this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')
        void sleep(5000)
          .then(async () => {
            await gracefullyExitProcess(2)
          })
          .catch(this.errorHandler.promiseCatch('shutting down application with shutdownSignal'))
      }
    })
  }

  public getConfigFilePath(filename: string): string {
    return path.resolve(this.configsDirectory, path.basename(filename))
  }

  public async start(): Promise<void> {
    this.syncBroadcast()

    for (const instance of this.getAllInstances()) {
      // must cast first before using due to typescript limitation
      // https://github.com/microsoft/TypeScript/issues/30650#issuecomment-486680485
      const checkedInstance = instance

      if (checkedInstance instanceof ConnectableInstance) {
        this.logger.debug(`Connecting instance type=${instance.instanceType},name=${instance.instanceName}`)
        await checkedInstance.connect()
      } else if (instance instanceof PluginInstance) {
        this.logger.debug(`Signaling plugin instance type=${instance.instanceType},name=${instance.instanceName}`)
        await instance.onReady()
      }
    }
  }

  public syncBroadcast(): void {
    this.logger.debug('Informing instances of each other')
    for (const instance of this.getAllInstances()) {
      instance.selfBroadcast()
    }

    this.logger.debug('Broadcasting all Minecraft bots')
    for (const minecraftBot of this.clusterHelper.getMinecraftBots()) {
      minecraftBot.localEvent = true
      this.emit('minecraftSelfBroadcast', minecraftBot)
    }

    this.logger.debug('Broadcasting all punishments')
    for (const punishment of this.moderation.punishments.all()) {
      punishment.localEvent = true
      this.emit('punishmentAdd', punishment)
    }
  }

  /**
   * Get all instances {@link InstanceIdentifier} exist in this application.
   * This includes all internal and public instances as well as plugins and utilities.
   */
  public getAllInstancesIdentifiers(): InstanceIdentifier[] {
    return this.getAllInstances().map((instance) => ({
      instanceName: instance.instanceName,
      instanceType: instance.instanceType
    }))
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

      const plugin = {
        promise: import(newPath).then((resolved: { default: PluginInterface }) => resolved.default),
        originalPath: pluginPath,
        name: path.basename(pluginPath)
      }

      this.applicationIntegrity.addLocalInstance({ instanceName: plugin.name, instanceType: InstanceType.Plugin })
      this.plugins.push(plugin)
    }

    return result
  }

  private getAllInstances(): (
    | Instance<unknown, InstanceType>
    | ConnectableInstance<unknown, InstanceType>
    | PluginInstance
  )[] {
    return [
      ...this.plugins,
      this.autoComplete,
      this.applicationIntegrity,

      ...this.loggerInstances, // loggers first to catch any connecting events and log them as well
      this.discordInstance, // discord second to send any notification about connecting

      this.moderation,
      this.metricsInstance,
      this.commandsInstance,
      ...this.minecraftInstances,

      this.socketInstance // socket last. so other instances are ready when connecting to other clients
    ].filter((instance) => instance != undefined)
  }
}

/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
function emitAll(emitter: Events, applicationIntegrity: ApplicationIntegrity): void {
  const old = emitter.emit
  emitter.emit = (event: string, ...callerArguments): boolean => {
    if (event !== 'all') {
      applicationIntegrity.checkEventIntegrity(event, callerArguments[0])
      emitter.emit('all', event, ...callerArguments)
    }
    return old.call(emitter, event, ...callerArguments)
  }
}

/* eslint-enable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument */
