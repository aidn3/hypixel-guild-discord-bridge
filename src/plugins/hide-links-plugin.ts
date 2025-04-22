import type Application from '../application.js'
import type { MinecraftSendChatPriority } from '../common/application-event.js'
import { OfficialPlugins } from '../common/application-internal-config.js'
import type { PluginInfo } from '../common/plugin-instance.js'
import PluginInstance from '../common/plugin-instance.js'
// eslint-disable-next-line import/no-restricted-paths
import MinecraftInstance from '../instance/minecraft/minecraft-instance.js'

export default class HideLinksPlugin extends PluginInstance {
  constructor(application: Application) {
    super(application, OfficialPlugins.HideLinks)
  }

  pluginInfo(): PluginInfo {
    return { description: 'Stop sending links to Hypixel to avoid message blocking', conflicts: [OfficialPlugins.Stuf] }
  }

  onReady(): Promise<void> | void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias,unicorn/no-this-assignment
    const self = this
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const sendMessage = MinecraftInstance.prototype.send

    MinecraftInstance.prototype.send = async function (
      message: string,
      priority: MinecraftSendChatPriority,
      originEventId: string | undefined
    ): Promise<void> {
      if (!self.enabled()) {
        await sendMessage.call(this, message, priority, originEventId)
        return
      }

      const modifiedMessage = message
        .split(' ')
        .map((part) => {
          try {
            if (part.startsWith('https:') || part.startsWith('http')) return '(link)'
          } catch {
            /* ignored */
          }
          return part
        })
        .join(' ')

      await sendMessage.call(this, modifiedMessage, priority, originEventId)
    }
  }
}
