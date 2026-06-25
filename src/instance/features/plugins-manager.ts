import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import type Application from '../../application.js'
import { Instance } from '../../common/instance.js'
import type PluginInstance from '../../common/plugin-instance.js'

export class PluginsManager extends Instance {
  private readonly instances: PluginInstance[] = []

  constructor(application: Application) {
    super(application, 'PluginsManager')
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
