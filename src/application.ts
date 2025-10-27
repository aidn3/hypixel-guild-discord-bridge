/* eslint @typescript-eslint/explicit-member-accessibility: "error" */
// @typescript-eslint/explicit-member-accessibility needed since this is part of the public api

import assert from 'node:assert'
import type Events from 'node:events'
import fs from 'node:fs'
import path from 'node:path'

import type { Awaitable } from 'discord.js'
import { Client as HypixelClient } from 'hypixel-api-reborn'
import type { Logger } from 'log4js'
import Logger4js from 'log4js'
import { TypedEmitter } from 'tiny-typed-emitter'

import type { ApplicationConfig } from './application-config.js'
import type { ApplicationEvents, InstanceIdentifier, MinecraftSendChatPriority } from './common/application-event.js'
import { InstanceSignalType, InstanceType } from './common/application-event.js'
import { ConfigManager } from './common/config-manager.js'
import { ConnectableInstance, Status } from './common/connectable-instance.js'
import PluginInstance from './common/plugin-instance.js'
import UnexpectedErrorHandler from './common/unexpected-error-handler.js'
import { Core } from './core/core'
import type { MojangApi } from './core/users/mojang'
import type { GeneralConfig } from './general-config.js'
import ApplicationIntegrity from './instance/application-integrity.js'
import { CommandsInstance } from './instance/commands/commands-instance.js'
import DiscordInstance from './instance/discord/discord-instance.js'
import { PluginsManager } from './instance/features/plugins-manager.js'
import MetricsInstance from './instance/metrics/metrics-instance.js'
import MinecraftInstance from './instance/minecraft/minecraft-instance.js'
import { MinecraftManager } from './instance/minecraft/minecraft-manager.js'
import PrometheusInstance from './instance/prometheus/prometheus-instance.js'
import type { LanguageConfig } from './language-config.js'
import { DefaultLanguageConfig } from './language-config.js'
import { gracefullyExitProcess, sleep } from './utility/shared-utility'

export type AllInstances =
  | CommandsInstance
  | DiscordInstance
  | PrometheusInstance
  | MetricsInstance
  | Core
  | MinecraftInstance
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
  private readonly backupDirectory
  private readonly config: Readonly<ApplicationConfig>

  public readonly language: ConfigManager<LanguageConfig>

  public readonly generalConfig: ConfigManager<GeneralConfig>
  public readonly discordInstance: DiscordInstance
  public readonly minecraftManager: MinecraftManager
  public readonly pluginsManager: PluginsManager
  public readonly commandsInstance: CommandsInstance
  public readonly core: Core
  private readonly prometheusInstance: PrometheusInstance | undefined
  private readonly metricsInstance: MetricsInstance

  public constructor(config: ApplicationConfig, rootDirectory: string, configsDirectory: string) {
    super()
    this.setMaxListeners(50)

    this.logger = Logger4js.getLogger('Application')
    this.errorHandler = new UnexpectedErrorHandler(this.logger)
    this.logger.trace('Application initiating')

    this.applicationIntegrity = new ApplicationIntegrity(this)

    emitAll(this, this.applicationIntegrity) // first thing to redirect all events
    this.config = config
    this.configsDirectory = configsDirectory
    this.rootDirectory = rootDirectory

    this.backupDirectory = path.join(configsDirectory, 'backup')
    this.applicationIntegrity.addConfigPath(this.backupDirectory)
    fs.mkdirSync(this.backupDirectory, { recursive: true })

    this.generalConfig = new ConfigManager(this, this.logger, this.getConfigFilePath('application.json'), {
      autoRestart: false,
      originTag: false
    })

    this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {
      cache: true,
      mojangCacheTime: 300,
      hypixelCacheTime: 300
    })
    this.language = new ConfigManager<LanguageConfig>(
      this,
      this.logger,
      this.getConfigFilePath('language.json'),
      DefaultLanguageConfig
    )

    this.core = new Core(this)
    this.mojangApi = this.core.mojangApi

    this.discordInstance = new DiscordInstance(this, this.config.discord)

    this.minecraftManager = new MinecraftManager(this)
    this.minecraftManager.loadInstances()

    this.pluginsManager = new PluginsManager(this)

    this.prometheusInstance = this.config.prometheus.enabled
      ? new PrometheusInstance(this, this.config.prometheus)
      : undefined
    this.metricsInstance = new MetricsInstance(this)
    this.commandsInstance = new CommandsInstance(this)
  }

  public getConfigFilePath(filename: string): string {
    return path.resolve(this.configsDirectory, path.basename(filename))
  }

  public getBackupPath(name: string): string {
    assert.ok(name.length > 0, "'name' must not be empty")

    const MaxTries = 3
    for (let tryCount = 0; tryCount < MaxTries; tryCount++) {
      const currentTime = Date.now()

      const basename = path.basename(name)
      const extension = path.extname(basename)
      const fileName = basename.slice(0, basename.length - extension.length)
      const fullName = `${fileName}-${currentTime}${extension}`

      const fullPath = path.join(this.backupDirectory, fullName)
      if (fs.existsSync(fullPath)) continue
      return fullPath
    }

    throw new Error(`could not find viable backup path for '${name}'.`)
  }

  public addShutdownListener(listener: () => void): void {
    this.shutdownListeners.push(listener)
  }

  public async start(): Promise<void> {
    await this.core.awaitReady()
    await this.pluginsManager.loadPlugins(this.rootDirectory)

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
    for (const instance of this.getAllInstances().toReversed()) {
      // reversed to go backward of `start()`
      if (instance instanceof ConnectableInstance && instance.currentStatus() !== Status.Fresh) {
        this.logger.debug(`Disconnecting instance type=${instance.instanceType},name=${instance.instanceName}`)
        tasks.push(instance.disconnect())
      }
    }
    await Promise.all(tasks)
  }

  /**
   * Send chat/command via Minecraft instance
   *
   * @param instanceNames The instance names to send the command through.
   * @param priority See {@link MinecraftSendChatPriority}
   * @param eventId
   * @param command The command to send
   */
  public async sendMinecraft(
    instanceNames: string[],
    priority: MinecraftSendChatPriority,
    eventId: string | undefined,
    command: string
  ): Promise<void> {
    const instances = []

    for (const instanceName of instanceNames) {
      const instance = this.instanceByName(instanceName)

      if (instance === undefined) {
        throw new Error(`no instance found with the name "${instanceName}"`)
      } else if (instance instanceof MinecraftInstance) {
        instances.push(instance)
      } else {
        throw new TypeError(`instance is not type MinecraftInstance. Actual=${instance.instanceType}`)
      }
    }

    const tasks = []
    for (const instance of instances) {
      tasks.push(instance.send(command, priority, eventId))
    }
    await Promise.all(tasks)
  }

  /**
   * Signal to shut down/restart an instance.
   *
   * Signaling to shut down the application is possible.
   * It will take some time for the application to shut down.
   * Application will auto restart if a process monitor is used.
   *
   * @param instanceNames The instance names to send the command through.
   * @param type A flag indicating the signal
   */
  public async sendSignal(instanceNames: string[], type: InstanceSignalType): Promise<void> {
    const instances = []

    for (const instanceName of instanceNames) {
      if (instanceName.toLowerCase() === this.instanceName.toLowerCase()) continue
      const instance = this.instanceByName(instanceName)

      if (instance === undefined) {
        throw new Error(`no instance found with the name "${instanceName}"`)
      } else if (instance instanceof ConnectableInstance) {
        instances.push(instance)
      } else {
        throw new TypeError(`instance is not type ConnectableInstance.`)
      }
    }

    const tasks = []
    for (const instance of instances) {
      tasks.push(instance.signal(type))
    }
    await Promise.all(tasks)

    const signalMain = instanceNames.some(
      (instanceName) => instanceName.toLowerCase() === this.instanceName.toLowerCase()
    )
    if (signalMain) {
      await this.receivedSignal(type)
    }
  }

  private async receivedSignal(type: InstanceSignalType): Promise<void> {
    this.logger.info('Shutdown signal has been received. Shutting down this node.')

    if (type === InstanceSignalType.Restart) {
      this.logger.info('Node should auto restart if a process monitor service is used.')
    }

    this.logger.info('Waiting 5 seconds for other nodes to receive the signal before shutting down.')
    await sleep(5000)
      .then(() => {
        this.logger.debug('shutting down application')
        return this.shutdown()
      })
      .then(() => gracefullyExitProcess(2))
      .catch(this.errorHandler.promiseCatch('shutting down application with instanceSignal'))
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

  private instanceByName(name: string): AllInstances | undefined {
    return this.getAllInstances().find((instance) => instance.instanceName.toLowerCase() === name.toLowerCase())
  }

  private getAllInstances(): AllInstances[] {
    const instances = [
      ...this.pluginsManager.getAllInstances(),
      this.core,
      this.applicationIntegrity,

      this.discordInstance, // discord second to send any notification about connecting

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
