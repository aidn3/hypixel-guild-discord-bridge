import {AxiosResponse} from "axios"
import {Registry} from "prom-client"
import {Gauge} from "prom-client"
import axios from "axios"

export default class GuildApiMetrics {
    private readonly guildTotalXp
    private readonly guildGameXp
    private readonly guildMembersCount

    constructor(register: Registry, prefix: string) {
        this.guildTotalXp = new Gauge({
            name: prefix + "guild_exp_total",
            help: 'Guild experience (or GEXP) a guild accumulated',
            labelNames: ['name'],
        })
        register.registerMetric(this.guildTotalXp)

        this.guildGameXp = new Gauge({
            name: prefix + "guild_exp_game",
            help: 'Guild experience (or GEXP) a guild accumulated based on game type',
            labelNames: ['name', 'type'],
        })
        register.registerMetric(this.guildGameXp)

        this.guildMembersCount = new Gauge({
            name: prefix + "guild_members",
            help: 'Guild members count',
            labelNames: ['name'],
        })
        register.registerMetric(this.guildMembersCount)
    }

    async collectMetrics(uuids: string[], hypixelKey: string): Promise<void> {
        for (let uuid of uuids) {
            if (!uuid) continue

            // TODO: add better logger structure
            let guild = await axios.get(`https://api.hypixel.net/guild?key=${hypixelKey}&player=${uuid}`)
                .then((res: AxiosResponse) => res.data.guild)
                .catch(() => undefined)

            if (!guild) continue

            this.guildTotalXp.set({name: guild["name_lower"]}, guild["exp"])

            for (let gameType of Object.keys(guild["guildExpByGameType"])) {
                let exp = guild["guildExpByGameType"][gameType]
                this.guildGameXp.set({name: guild["name_lower"], type: gameType}, exp)
            }

            this.guildMembersCount.set({name: guild["name_lower"]}, guild["members"].length)
        }
    }
}
