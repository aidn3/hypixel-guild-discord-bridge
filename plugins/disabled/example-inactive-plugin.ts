import type Application from 'src/application.js'
import type { PluginInfo } from 'src/common/plugin-instance.js'
import PluginInstance from 'src/common/plugin-instance.js'
import type { PluginsManager } from 'src/instance/features/plugins-manager.js'

/* NOTICE
THIS PLUGIN DOES NOTHING. ITS PURPOSE IS TO PROVIDE AN EXAMPLE SYNTAX.
*/
export default class ExampleInactivePlugin extends PluginInstance {
  constructor(application: Application, pluginsManager: PluginsManager) {
    super(application, pluginsManager, 'example-inactive-plugin')
  }

  onReady(): Promise<void> | void {
    throw new Error('Running is running even though it is in disabled dir!')
  }

  pluginInfo(): PluginInfo {
    return { description: 'This is an example plugin that will not be loaded.' }
  }
}
