import assert from 'node:assert'
import { randomUUID } from 'node:crypto'

import type { Config, Identity } from '@kolapsis/shm-sdk'
import { generateKeypair, SHMClient } from '@kolapsis/shm-sdk'

import PackageJson from '../../../package.json'
import type Application from '../../application.js'
import { ChannelType } from '../../common/application-event.js'
import { ConnectableInstance, Status } from '../../common/connectable-instance.js'
import Duration from '../../utility/duration'

// eslint-disable-next-line import/no-restricted-paths
import { MetricsConfigurations } from './metrics-configurations'

// @ts-expect-error properties private
declare class ExtendedSHMClient extends SHMClient {
  public identity: Identity
  public config: Config
  public log: (message: string) => void
}

export default class MetricsInstance extends ConnectableInstance {
  private static readonly SendEvery = Duration.minutes(15)
  private static readonly Host = 'https://shm.aidn5.com'

  private readonly telemetry: ExtendedSHMClient

  constructor(app: Application) {
    super(app, 'Metrics')

    const config = new MetricsConfigurations(this.application.core.getConfigurationsManager())

    const telemetry = new SHMClient({
      serverUrl: MetricsInstance.Host,
      appName: PackageJson.name,
      appVersion: PackageJson.version,
      enabled: false,
      reportIntervalMs: MetricsInstance.SendEvery.toMilliseconds()
    })

    this.telemetry = telemetry as unknown as ExtendedSHMClient

    /**
     * This is the work of the devil.
     *
     * SHMClient does not support custom identity loading.
     * So, the only way to do it is by:
     * - disabling the client by passing "enabled" as false to stop it from generating a random identity
     * - creating the identity by accessing private properties
     * - re-enabling the client by accessing its private configuration
     */
    let identity: Identity | undefined = config.getIdentityObject()
    if (identity === undefined) {
      identity = { instanceId: randomUUID(), ...generateKeypair() }
      config.setIdentityObject(identity)
    }
    assert.ok('identity' in this.telemetry)
    this.telemetry.identity = identity
    assert.ok('config' in this.telemetry)
    this.telemetry.config.enabled = true
    assert.ok('log' in this.telemetry)
    this.telemetry.log = (message: string) => {
      this.logger.log(message)
    }

    let totalMessages = config.getTotalMessages()
    let totalCommands = config.getTotalCommands()
    this.application.on('chat', (event) => {
      if (event.channelType === ChannelType.Public || event.channelType === ChannelType.Officer) {
        config.setTotalMessages(++totalMessages)
      }
    })
    this.application.on('command', () => {
      config.setTotalCommands(++totalCommands)
    })

    this.telemetry.setProvider(async () => {
      const minecraftInstances = this.application.minecraftManager.getAllInstances()
      const activeInstances = minecraftInstances.filter((instance) => instance.currentStatus() === Status.Connected)
      let totalGuildMembers = 0
      let onlineGuildMembers = 0
      await Promise.allSettled(
        activeInstances.map((instance) =>
          instance.guildManager.list().then((guild) => {
            totalGuildMembers += guild.members.length
            onlineGuildMembers += guild.members.filter((member) => member.online).length
          })
        )
      )

      return {
        totalMessages: totalMessages,
        totalCommands: totalCommands,
        totalMinecraftInstances: minecraftInstances.length,
        totalActiveMinecraftInstances: activeInstances.length,
        totalGuildMembers: totalGuildMembers,
        onlineGuildMembers: onlineGuildMembers
      }
    })
  }

  async connect(): Promise<void> {
    const controller = this.telemetry.start()
    this.abortController.signal.addEventListener('abort', (reason) => {
      controller.abort(reason)
    })
    this.logger.debug('instance ready and will be sending periodical anonymous metrics')
    await this.setAndBroadcastNewStatus(Status.Connected)
  }

  async disconnect(): Promise<void> {
    this.telemetry.stop()
    await this.setAndBroadcastNewStatus(Status.Ended)
  }
}
