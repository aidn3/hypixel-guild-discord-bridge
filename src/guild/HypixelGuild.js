const axios = require('axios')

const NodeCache = require("node-cache")
const GuildCache = new NodeCache({stdTTL: 3600}) // 1 hour
const UsernamesCache = new NodeCache({stdTTL: 3600 * 24}) // 24 hour

const HYPIXEL_KEY = process.env.HYPIXEL_KEY

class HypixelGuild {
    #bridge;

    constructor(bridge) {
        this.#bridge = bridge
    }

    async isGuildMember(username) {
        let playerUuid = await this.getUuidByUsername(username)
        let guildMembers = await this.getGuildMembers(playerUuid)
        return guildMembers
            .some(member => {
                // check same bot in the same guild
                return this.#bridge.minecraftInstances
                    .some(inst => inst.uuid() === member.uuid)
            })
    }

    async getGuildMembers(playerUuid) {
        let cachedResult = GuildCache.get(playerUuid)
        if (cachedResult) return cachedResult

        let res = await axios.get(`https://api.hypixel.net/guild?key=${HYPIXEL_KEY}&player=${playerUuid}`)
        let guildRes = res.data
        let members = guildRes.guild.members

        GuildCache.set(playerUuid, members)
        return members
    }

    async getUuidByUsername(username) {
        let cachedResult = UsernamesCache.get(username)
        if (cachedResult) return cachedResult

        let res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
        let json = res.data
        let uuid = json.id

        UsernamesCache.set(username, uuid)
        return uuid
    }
}

module.exports = HypixelGuild