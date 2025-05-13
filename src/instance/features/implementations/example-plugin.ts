import type Application from '../../../application.js'
import type { PluginInfo } from '../../../common/plugin-instance.js'
import PluginInstance from '../../../common/plugin-instance.js'
import type { PluginsManager } from '../plugins-manager.js'

/* NOTICE
THIS PLUGIN DOES NOTHING. ITS PURPOSE IS TO PROVIDE AN EXAMPLE SYNTAX.
*/
export default class ExamplePlugin extends PluginInstance {
  constructor(application: Application, pluginsManager: PluginsManager) {
    super(application, pluginsManager, 'example-plugin')
  }

  onReady(): Promise<void> | void {
    this.logger.info('Running on plugin')
    // do something e.g:
    // this.application.clusterHelper.sendCommandToAllMinecraft(this.eventHelper, 'hello there!')
  }

  pluginInfo(): PluginInfo {
    return { description: 'This is an example plugin.' }
  }
}
