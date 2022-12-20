/*
 CREDIT: Idea by Aura
 Discord: Aura#5051
 Minecraft username: _aura
*/

import MinecraftInstance from "../MinecraftInstance"
import {MinecraftCommandMessage} from "../common/ChatInterface"
import {Client} from "hypixel-api-reborn"

const moment = require("moment")
const mojang = require("mojang")

export default <MinecraftCommandMessage>{
    triggers: ['guild', 'guildOf', 'g'],
    enabled: true,
    handler: async function (clientInstance: MinecraftInstance, username: string, args: string[]): Promise<string> {

        let givenUsername = args[0] !== undefined ? args[0] : username
        let uuid = await mojang.lookupProfileAt(givenUsername)
            .then((p: { id: any }) => p.id)

        if (!uuid) {
            return `No such username! (given: ${givenUsername})`
        }

        return `${givenUsername}'s guild: ${await fetchGuildInfo(clientInstance.app.hypixelApi, uuid)}`
    }
}

async function fetchGuildInfo(hypixel: Client, uuid: string) {
    let guild = await hypixel.getGuild("player", uuid, {})

    if (!guild) return "No Guild."

    let member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
    return `Name: ${guild.name}`
        + ` / Level: ${guild.level}`
        + ` / Created: ${moment(guild.createdAtTimestamp).format('YYYY-MM-DD')}`
        + ` / Members: ${guild.members.length}/125`
        + ` / Rank: ${member?.rank}`
        + ` / Joined: ${moment(member?.joinedAtTimestamp).format('YYYY-MM-DD')}`
}
