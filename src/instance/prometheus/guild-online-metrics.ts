import type { Registry } from 'prom-client'
import { Gauge } from 'prom-client'

import type Application from '../../application.js'

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
    const tasks: Promise<unknown>[] = []
    for (const instance of app.minecraftManager.getAllInstances()) {
      const name = instance.getConfigName()
      tasks.push(
        instance.guildManager.list().then((guild) => {
          this.guildOnlineMembersCount.set({ name: name }, guild.members.filter((member) => member.online).length)
          this.guildTotalMembersCount.set({ name: name }, guild.members.length)
        })
      )
    }

    await Promise.allSettled(tasks)
  }
}
