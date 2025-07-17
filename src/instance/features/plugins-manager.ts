import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'
import { ConfigManager } from '../../common/config-manager.js'
import { Instance, InternalInstancePrefix } from '../../common/instance.js'
import type PluginInstance from '../../common/plugin-instance.js'

import type { PluginConfig } from './common/plugins-config.js'
import AutoRestartPlugin from './implementations/auto-restart-plugin.js'
import DarkAuctionPlugin from './implementations/dark-auction-plugin.js'
import StarfallCultPlugin from './implementations/starfall-cult-plugin.js'

export class PluginsManager extends Instance<InstanceType.Util> {
  private readonly config: ConfigManager<PluginConfig>
  private readonly instances: PluginInstance[] = []

  constructor(application: Application) {
    super(application, InternalInstancePrefix + 'PluginsManager', InstanceType.Util)

    this.config = new ConfigManager(application, this.logger, application.getConfigFilePath('features-manager.json'), {
      darkAuctionReminder: true,
      starfallCultReminder: true
    })

    this.instances.push(
      new AutoRestartPlugin(application, this),
      new DarkAuctionPlugin(application, this),
      new StarfallCultPlugin(application, this)
    )
  }

  public getConfig(): ConfigManager<PluginConfig> {
    return this.config
  }

  public checkConflicts(pluginsNames: string[]): { pluginName: string; incompatibleWith: string }[] {
    if (pluginsNames.length <= 1) return []

    const localPlugins = this.getAllInstances().filter((plugin) => pluginsNames.includes(plugin.instanceName))

    const conflicts: { pluginName: string; incompatibleWith: string }[] = []

    for (let index = 0; index < pluginsNames.length - 1; index++) {
      const firstPlugin = localPlugins[index]

      for (let secondIndex = index + 1; secondIndex < pluginsNames.length; secondIndex++) {
        const secondPlugin = localPlugins[secondIndex]

        if (firstPlugin.pluginInfo().conflicts?.includes(secondPlugin.instanceName)) {
          conflicts.push({ pluginName: firstPlugin.instanceName, incompatibleWith: secondPlugin.instanceName })
        } else if (secondPlugin.pluginInfo().conflicts?.includes(firstPlugin.instanceName)) {
          conflicts.push({ pluginName: secondPlugin.instanceName, incompatibleWith: firstPlugin.instanceName })
        }
      }
    }

    return conflicts
  }

  public async loadPlugins(rootDirectory: string): Promise<void> {
    const plugins: PluginInstance[] = []

    const pluginsDirectory = path.join(rootDirectory, 'plugins')
    for (const pluginPath of fs.readdirSync(pluginsDirectory)) {
      let newPath: string = path.resolve(pluginsDirectory, pluginPath)

      if (!pluginPath.endsWith('.ts')) continue
      if (!fs.statSync(newPath).isFile()) continue

      if (process.platform === 'win32' && !newPath.startsWith('file:///')) {
        newPath = `file:///${newPath}`
      }

      this.logger.info(`Loading plugin: ${pluginPath}`)
      const plugin = await import(newPath)
        .then((resolved: { default: typeof PluginInstance }) => resolved.default)
        // @ts-expect-error although it says it is an abstract, the class isn't since it is extended.
        .then((clazz) => new clazz(this.application, this) as PluginInstance)

      plugins.push(plugin)
    }

    this.instances.push(...plugins)
  }

  public getAllInstances(): PluginInstance[] {
    return this.instances
  }
}
