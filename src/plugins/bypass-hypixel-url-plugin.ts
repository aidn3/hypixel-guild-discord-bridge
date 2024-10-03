import type { PluginContext, PluginInterface } from '../common/plugins.js'
import ChatManager from '../instance/minecraft/chat-manager.js'

/* WARNING
THIS IS AN OPTIONAL PLUGIN. TO DISABLE IT, REMOVE THE PATH FROM 'config.yaml' PLUGINS
*/

/*
 * Bypass Hypixel restriction on hyperlinks.
 * This plugin works in conjunction with ChatTrigger module: BridgeChatTrigger
 * see: https://www.chattriggers.com/modules/v/BridgeChatTrigger
 */
export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRun(context: PluginContext): void {
    // @ts-expect-error onMessage is private
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const original = ChatManager.prototype.onMessage

    // @ts-expect-error onMessage is private
    ChatManager.prototype.onMessage = function (message: string): void {
      const modifiedMessage = message
        .split(' ')
        .map((part) => {
          if (part.startsWith('https:')) return `bridge-url:${part.replaceAll('.', '%xx')}`
          return part
        })
        .join(' ')

      original.call(this, modifiedMessage)
    }
  }
} satisfies PluginInterface
