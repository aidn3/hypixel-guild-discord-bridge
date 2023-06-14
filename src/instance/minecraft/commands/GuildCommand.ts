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


        let guild = await clientInstance.app.hypixelApi.getGuild("player", uuid, {})
        if (!guild) return `${givenUsername} is not in any guild.`

        let member = guild.members.find((m: { uuid: string }) => m.uuid === uuid)
        return `${givenUsername} in ${guild.name} (${guild.members.length}/125) as ${member?.rank}`
    }
}
