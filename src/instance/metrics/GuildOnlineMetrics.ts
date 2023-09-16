import { Registry, Gauge } from 'prom-client'
import { MinecraftRawChatEvent } from '../../common/ApplicationEvent'
import Application from '../../Application'

export default class GuildOnlineMetrics {
  private readonly guildTotalMembersCount
  private readonly guildOnlineMembersCount: Gauge

  constructor(register: Registry, prefix: string) {
    this.guildTotalMembersCount = new Gauge({
      name: prefix + 'guild_members',
      help: 'Guild members count',
      labelNames: ['name']
    })
    register.registerMetric(this.guildTotalMembersCount)

    this.guildOnlineMembersCount = new Gauge({
      name: prefix + 'guild_members_online',
      help: 'Guild online members',
      labelNames: ['name']
    })
    register.registerMetric(this.guildOnlineMembersCount)
  }

  async collectMetrics(app: Application): Promise<void> {
    const guilds = await GuildOnlineMetrics.getGuilds(app)
    for (const [instanceName, guild] of guilds) {
      if (guild.total != null) {
        this.guildTotalMembersCount.set({ name: instanceName }, guild.total)
      }

      if (guild.online != null) {
        this.guildOnlineMembersCount.set({ name: instanceName }, guild.online)
      }
    }
  }

  static async getGuilds(app: Application): Promise<Map<string, { online?: number; total?: number }>> {
    const guilds = new Map<string, { online?: number; total?: number }>()

    const onlineRegex = /^Online Members: (\d+)$/g
    const totalRegex = /^Total Members: (\d+)$/g
    const chatListener = (event: MinecraftRawChatEvent): void => {
      if (event.message.length === 0) return

      let guild = guilds.get(event.instanceName)
      if (guild == null) {
        guild = {}
        guilds.set(event.instanceName, guild)
      }

      const totalMatch = totalRegex.exec(event.message)
      if (totalMatch != null) guild.total = Number(totalMatch[1])

      const onlineMatch = onlineRegex.exec(event.message)
      if (onlineMatch != null) guild.online = Number(onlineMatch[1])
    }

    app.on('minecraftChat', chatListener)
    app.clusterHelper.sendCommandToAllMinecraft('/guild online')
    await new Promise((resolve) => setTimeout(resolve, 3000))
    app.removeListener('minecraftChat', chatListener)

    return guilds
  }
}
