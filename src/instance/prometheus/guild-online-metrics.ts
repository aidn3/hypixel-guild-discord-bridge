import type { Registry } from 'prom-client'
import { Gauge } from 'prom-client'

import type Application from '../../application.js'
import { InstanceType } from '../../common/application-event.js'

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
    for (const instanceName of app.getInstancesNames(InstanceType.Minecraft)) {
      tasks.push(
        app.usersManager.guildManager.totalOnline(instanceName).then((count) => {
          this.guildOnlineMembersCount.set({ name: instanceName }, count)
        }),
        app.usersManager.guildManager.totalMembers(instanceName).then((count) => {
          this.guildTotalMembersCount.set({ name: instanceName }, count)
        })
      )
    }

    await Promise.allSettled(tasks)
  }
}
