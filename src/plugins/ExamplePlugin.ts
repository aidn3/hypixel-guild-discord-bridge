import { PluginInterface, PluginContext } from '../common/Plugins'

export default {
  onRun(context: PluginContext): void {
    // modify something e.g:
    // app.ClusterHelper.sendCommandToAllMinecraft("hello there!")
  }
} satisfies PluginInterface
