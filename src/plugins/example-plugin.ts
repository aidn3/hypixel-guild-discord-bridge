import PluginInstance from '../common/plugin-instance.js'

/* NOTICE
THIS PLUGIN DOES NOTHING. ITS PURPOSE IS TO PROVIDE AN EXAMPLE OF SYNTAX.
DELETING THIS FILE WILL HAVE NO ADVERSE AFFECTS
*/
export default class ExamplePlugin extends PluginInstance {
  onReady(): Promise<void> | void {
    this.logger.info('Running on plugin')
    // do something e.g:
    // this.application.clusterHelper.sendCommandToAllMinecraft(this.eventHelper, 'hello there!')
  }
}
