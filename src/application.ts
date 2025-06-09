/* eslint @typescript-eslint/explicit-member-accessibility: "error" */
// @typescript-eslint/explicit-member-accessibility needed since this is part of the public api

import type Events from 'node:events'
import path from 'node:path'

import type { Awaitable } from 'discord.js'
import { Client as HypixelClient } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'
import { default as Logger4js } from 'log4js'
import { TypedEmitter } from 'tiny-typed-emitter'

import type { ApplicationConfig } from './application-config.js'
import type { ApplicationEvents, InstanceIdentifier } from './common/application-event.js'
import { InstanceSignalType, InstanceType } from './common/application-event.js'
import { ConnectableInstance, Status } from './common/connectable-instance.js'
import PluginInstance from './common/plugin-instance.js'
import UnexpectedErrorHandler from './common/unexpected-error-handler.js'
import ApplicationIntegrity from './instance/application-integrity.js'
import { CommandsInstance } from './instance/commands/commands-instance.js'
import DiscordInstance from './instance/discord/discord-instance.js'
import { PluginsManager } from './instance/features/plugins-manager.js'
import MetricsInstance from './instance/metrics/metrics-instance.js'
import type MinecraftInstance from './instance/minecraft/minecraft-instance.js'
import { MinecraftManager } from './instance/minecraft/minecraft-manager.js'
import ModerationInstance from './instance/moderation/moderation-instance.js'
import PrometheusInstance from './instance/prometheus/prometheus-instance.js'
import UsersManager from './instance/users/users-manager.js'
import { MojangApi } from './util/mojang.js'
import { gracefullyExitProcess, sleep } from './util/shared-util.js'

export type AllInstances =
  | CommandsInstance
  | DiscordInstance
  | PrometheusInstance
  | MetricsInstance
  | UsersManager
  | MinecraftInstance
  | ModerationInstance
  | PluginInstance
  | ApplicationIntegrity
  | MinecraftManager
  | PluginsManager

export default class Application extends TypedEmitter<ApplicationEvents> implements InstanceIdentifier {
  public readonly instanceName: string = InstanceType.Main
  public readonly instanceType: InstanceType = InstanceType.Main

  public readonly applicationIntegrity: ApplicationIntegrity

  public readonly hypixelApi: HypixelClient
  public readonly mojangApi: MojangApi

  private readonly logger: Logger
  private readonly errorHandler: UnexpectedErrorHandler
  private readonly shutdownListeners: (() => void)[] = []

  private readonly rootDirectory
  private readonly configsDirectory
  private readonly config: Readonly<ApplicationConfig>

  public readonly discordInstance: DiscordInstance
  public readonly minecraftManager: MinecraftManager
  public readonly pluginsManager: PluginsManager
  public readonly moderation: ModerationInstance
  public readonly commandsInstance: CommandsInstance
  public readonly usersManager: UsersManager
  private readonly prometheusInstance: PrometheusInstance | undefined
  private readonly metricsInstance: MetricsInstance

  public constructor(config: ApplicationConfig, rootDirectory: string, configsDirectory: string) {
    super()
    this.logger = Logger4js.getLogger('Application')
    this.errorHandler = new UnexpectedErrorHandler(this.logger)
    this.logger.trace('Application initiating')

    this.applicationIntegrity = new ApplicationIntegrity(this)

    emitAll(this, this.applicationIntegrity) // first thing to redirect all events
    this.config = config
    this.configsDirectory = configsDirectory
    this.rootDirectory = rootDirectory

    this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {
      cache: true,
      mojangCacheTime: 300,
      hypixelCacheTime: 300
    })
    this.mojangApi = new MojangApi()
    this.moderation = new ModerationInstance(this, this.mojangApi)
    this.usersManager = new UsersManager(this)

    this.discordInstance = new DiscordInstance(this, this.config.discord)

    this.minecraftManager = new MinecraftManager(this)
    this.minecraftManager.loadInstances()

    this.pluginsManager = new PluginsManager(this)

    this.prometheusInstance = this.config.prometheus.enabled
      ? new PrometheusInstance(this, this.config.prometheus)
      : undefined
    this.metricsInstance = new MetricsInstance(this)
    this.commandsInstance = new CommandsInstance(this)

    this.on('instanceSignal', (event) => {
      if (event.targetInstanceName.includes(this.instanceName)) {
        this.logger.info('Shutdown signal has been received. Shutting down this node.')
        if (event.type === InstanceSignalType.Restart) {
          this.logger.info('Node should auto restart if a process monitor service is used.')
        }

        this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')
        void sleep(5000)
          .then(() => {
            this.logger.debug('shutting down application')
            return this.shutdown()
          })
          .then(() => gracefullyExitProcess(2))
          .catch(this.errorHandler.promiseCatch('shutting down application with instanceSignal'))
      }
    })
  }

  public getConfigFilePath(filename: string): string {
    return path.resolve(this.configsDirectory, path.basename(filename))
  }

  public addShutdownListener(listener: () => void): void {
    this.shutdownListeners.push(listener)
  }

  public async start(): Promise<void> {
    await this.pluginsManager.loadPlugins(this.rootDirectory, this.config.plugins)

    for (const instance of this.getAllInstances()) {
      // must cast first before using due to typescript limitation
      // https://github.com/microsoft/TypeScript/issues/30650#issuecomment-486680485
      const checkedInstance = instance

      if (checkedInstance instanceof MetricsInstance) {
        if (this.config.general.shareMetrics) {
          checkedInstance.connect()
        }
      } else if (checkedInstance instanceof ConnectableInstance) {
        this.logger.debug(`Connecting instance type=${instance.instanceType},name=${instance.instanceName}`)
        await checkedInstance.connect()
      } else if (instance instanceof PluginInstance) {
        this.logger.debug(`Signaling plugin instance type=${instance.instanceType},name=${instance.instanceName}`)
        await instance.onReady()
      }
    }
  }

  public async shutdown(): Promise<void> {
    for (const shutdownListener of this.shutdownListeners) {
      shutdownListener()
    }

    const tasks: Awaitable<unknown>[] = []
    for (const instance of this.getAllInstances().reverse()) {
      // reversed to go backward of `start()`
      if (instance instanceof ConnectableInstance && instance.currentStatus() !== Status.Fresh) {
        this.logger.debug(`Disconnecting instance type=${instance.instanceType},name=${instance.instanceName}`)
        tasks.push(instance.disconnect())
      }
    }
    await Promise.all(tasks)
  }

  public getInstancesNames(instanceType: InstanceType): string[] {
    return this.getAllInstancesIdentifiers()
      .filter((instance) => instance.instanceType === instanceType)
      .map((instance) => instance.instanceName)
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

  private getAllInstances(): AllInstances[] {
    const instances = [
      ...this.pluginsManager.getAllInstances(),
      this.usersManager,
      this.applicationIntegrity,

      this.discordInstance, // discord second to send any notification about connecting

      this.moderation,
      this.prometheusInstance,
      this.metricsInstance,
      this.commandsInstance,
      ...this.minecraftManager.getAllInstances()
    ].filter((instance) => instance != undefined)

    this.applicationIntegrity.checkLocalInstancesIntegrity(instances)
    return instances
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
