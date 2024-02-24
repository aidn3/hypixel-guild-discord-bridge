import type { PluginInterface, PluginContext } from '../common/Plugins'

export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRun(context: PluginContext): void {
    // modify something e.g:
    // app.ClusterHelper.sendCommandToAllMinecraft("hello there!")
  }
} satisfies PluginInterface
