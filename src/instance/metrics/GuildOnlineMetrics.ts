import {Registry, Gauge} from "prom-client"
import {MinecraftRawChatEvent} from "../../common/ApplicationEvent"
import Application from "../../Application"

export default class GuildOnlineMetrics {
    private readonly guildOnlineMembersCount: Gauge<string>

    constructor(register: Registry, prefix: string) {
        this.guildOnlineMembersCount = new Gauge({
            name: prefix + "guild_members_online",
            help: 'Guild online members',
            labelNames: ['name'],
        })
        register.registerMetric(this.guildOnlineMembersCount)
    }

    async collectMetrics(app: Application): Promise<void> {
        let onlineMembers = await GuildOnlineMetrics.getOnlineMembers(app)
        for (let [instanceName, onlineCount] of onlineMembers) {
            this.guildOnlineMembersCount.set({name: instanceName}, onlineCount)
        }
    }

    static async getOnlineMembers(app: Application): Promise<Map<string, number>> {
        let onlineMembers = new Map<string, number>()

        const onlineRegex = /^Online Members: (\d+)$/g
        const chatListener = (event: MinecraftRawChatEvent) => {
            if (!event.message) return

            let onlineMatch = onlineRegex.exec(event.message)
            if (onlineMatch) onlineMembers.set(event.instanceName, Number(onlineMatch[1]))
        }

        app.on('minecraftChat', chatListener)
        app.clusterHelper.sendCommandToAllMinecraft("/guild list")
        await new Promise(r => setTimeout(r, 3000))
        app.removeListener('minecraftChat', chatListener)

        return onlineMembers
    }
}
