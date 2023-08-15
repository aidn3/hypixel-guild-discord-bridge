import axios, { AxiosResponse } from 'axios'
import { Registry, Gauge } from 'prom-client'

export default class GuildApiMetrics {
  private readonly guildTotalXp
  private readonly guildGameXp
  private readonly guildMembersCount

  constructor (register: Registry, prefix: string) {
    this.guildTotalXp = new Gauge({
      name: prefix + 'guild_exp_total',
      help: 'Guild experience (or GEXP) a guild accumulated',
      labelNames: ['name']
    })
    register.registerMetric(this.guildTotalXp)

    this.guildGameXp = new Gauge({
      name: prefix + 'guild_exp_game',
      help: 'Guild experience (or GEXP) a guild accumulated based on game type',
      labelNames: ['name', 'type']
    })
    register.registerMetric(this.guildGameXp)

    this.guildMembersCount = new Gauge({
      name: prefix + 'guild_members',
      help: 'Guild members count',
      labelNames: ['name']
    })
    register.registerMetric(this.guildMembersCount)
  }

  async collectMetrics (uuids: string[], hypixelKey: string): Promise<void> {
    for (const uuid of uuids) {
      if (uuid === undefined || uuid === null) continue

      // TODO: add better logger structure
      const guild = await axios.get(`https://api.hypixel.net/guild?key=${hypixelKey}&player=${uuid}`)
        .then((res: AxiosResponse) => res.data.guild)
        .catch(() => undefined)

      if (guild === undefined) continue

      this.guildTotalXp.set({ name: guild.name_lower }, guild.exp)

      for (const gameType of Object.keys(guild.guildExpByGameType)) {
        const exp = guild.guildExpByGameType[gameType]
        this.guildGameXp.set({
          name: guild.name_lower,
          type: gameType
        }, exp)
      }

      this.guildMembersCount.set({ name: guild.name_lower }, guild.members.length)
    }
  }
}
