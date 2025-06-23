import { uptime } from 'node:process'

import type Application from '../../../application.js'
import { ChannelType, Color, InstanceSignalType } from '../../../common/application-event.js'
import type { PluginInfo } from '../../../common/plugin-instance.js'
import PluginInstance from '../../../common/plugin-instance.js'
import { OfficialPlugins } from '../common/plugins-config.js'
import type { PluginsManager } from '../plugins-manager.js'

export default class AutoRestartPlugin extends PluginInstance {
  private static readonly MaxLifeTillRestart = 24 * 60 * 60 // 24 hour in seconds
  private static readonly CheckEvery = 5 * 60 * 1000 // 5 minutes in milliseconds
  constructor(application: Application, pluginsManager: PluginsManager) {
    super(application, pluginsManager, OfficialPlugins.AutoRestart)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Schedule restarting every 24 hours' }
  }

  onReady(): Promise<void> | void {
    let shuttingDown = false

    setInterval(() => {
      if (!this.enabled()) return

      if (shuttingDown) return

      if (AutoRestartPlugin.MaxLifeTillRestart < uptime()) {
        shuttingDown = true

        this.application.emit('broadcast', {
          ...this.eventHelper.fillBaseEvent(),

          channels: [ChannelType.Public],
          color: Color.Info,

          username: undefined,
          message: 'Application Restarting: Scheduled restart'
        })

        this.application.emit('instanceSignal', {
          ...this.eventHelper.fillBaseEvent(),

          type: InstanceSignalType.Restart,
          targetInstanceName: [this.application.instanceName]
        })
      }
    }, AutoRestartPlugin.CheckEvery)
  }

  private enabled(): boolean {
    return this.application.generalConfig.data.autoRestart
  }
}
