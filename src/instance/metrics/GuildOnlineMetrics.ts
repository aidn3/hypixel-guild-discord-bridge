import { Registry, Gauge } from 'prom-client'
import { MinecraftRawChatEvent } from '../../common/ApplicationEvent'
import Application from '../../Application'

export default class GuildOnlineMetrics {
  private readonly guildOnlineMembersCount: Gauge<string>

  constructor (register: Registry, prefix: string) {
    this.guildOnlineMembersCount = new Gauge({
      name: prefix + 'guild_members_online',
      help: 'Guild online members',
      labelNames: ['name']
    })
    register.registerMetric(this.guildOnlineMembersCount)
  }

  async collectMetrics (app: Application): Promise<void> {
    const onlineMembers = await GuildOnlineMetrics.getOnlineMembers(app)
    for (const [instanceName, onlineCount] of onlineMembers) {
      this.guildOnlineMembersCount.set({ name: instanceName }, onlineCount)
    }
  }

  static async getOnlineMembers (app: Application): Promise<Map<string, number>> {
    const onlineMembers = new Map<string, number>()

    const onlineRegex = /^Online Members: (\d+)$/g
    const chatListener = (event: MinecraftRawChatEvent): void => {
      if (event.message.length === 0) return

      const onlineMatch = onlineRegex.exec(event.message)
      if (onlineMatch != null) onlineMembers.set(event.instanceName, Number(onlineMatch[1]))
    }

    app.on('minecraftChat', chatListener)
    app.clusterHelper.sendCommandToAllMinecraft('/guild online')
    await new Promise(resolve => setTimeout(resolve, 3000))
    app.removeListener('minecraftChat', chatListener)

    return onlineMembers
  }
}
