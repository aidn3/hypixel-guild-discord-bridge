import Application from "../Application"
import {MinecraftRawChatEvent} from "../common/ApplicationEvent"
import PluginInterface from "../common/PluginInterface"
import {ClientInstance} from "../common/ClientInstance"
import {Client} from "hypixel-api-reborn"

const logger = require("log4js").getLogger("FragbotPlugin")
const Mojang = require("mojang")
const repartyWhitelist = new (require("node-cache"))({stdTTL: 30}) // 30 second
const CONFIG = require("../../config/fragbot-config.json")


function partyDisband(message: string): void {
    const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has disbanded the party!$/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        logger.debug(`${username} has disbanded the party. Adding them to reparty whitelist...`)
        repartyWhitelist.set(username, true)
    }
}

function autoLeave(sendCommand: (command: string) => void, username: string) {
    logger.debug(`auto leaving party if not confirmed to stay by re-partying`)

    setTimeout(() => {
        if (!repartyWhitelist.get(username)) {
            logger.debug(`Time out. Leaving ${username}'s party...`)
            sendCommand("/party leave")

        } else {
            logger.debug(`Party leaving is aborted for ${username}`)
        }
    }, CONFIG.autoLeavePartyAfter)
}

async function isGuildMember(username: string, hypixelApi: Client, botsUuid: string[]) {
    if (!CONFIG.whitelistGuild) return false

    let uuid = await Mojang.lookupProfileAt(username).then((res: any) => res.id.toString())

    let members = await hypixelApi.getGuild("player", uuid, {})
        .then(res => res.members)

    // bot in same guild
    return members.some(member => botsUuid.some(botUuid => botUuid === member.uuid))
}

async function partyInvite(message: string, sendCommand: (command: string) => void, hypixelApi: Client, getMinecraftBotsUuid: () => string[]) {
    const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has invited you to join their party!$/gm

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        logger.debug(`${username} has sent a party invite`)

        if (repartyWhitelist.get(username)) {
            logger.debug(`auto accepting ${username}'s party since it is a reparty`)
            sendCommand(`/party accept ${username}`)

        } else if (CONFIG.whitelisted.some(((p: string) => p.toLowerCase().trim() === username.toLowerCase().trim()))) {
            logger.debug(`accepting ${username}'s party since they are whitelisted`)
            sendCommand(`/party accept ${username}`)
            autoLeave(sendCommand, username)

        } else if (await isGuildMember(username, hypixelApi, getMinecraftBotsUuid())) {
            logger.debug(`accepting ${username}'s party since they are from the same guild`)
            sendCommand(`/party accept ${username}`)
            autoLeave(sendCommand, username)

        } else {
            logger.debug(`ignoring ${username}'s party...`)
        }

        return true
    }
}


export default <PluginInterface>{
    onRun(app: Application, getLocalInstance: (instanceName: string) => ClientInstance<any> | undefined): any {
        app.on("minecraftChat", async (event: MinecraftRawChatEvent) => {

            // only local instances are affected by their local plugins
            let minecraftInstance = getLocalInstance(event.instanceName)
            if (minecraftInstance) {

                let sendCommand = (command: string): void => {
                    app.clusterHelper.sendCommandToMinecraft(event.instanceName, command)
                }


                partyDisband(event.message)
                await partyInvite(event.message, sendCommand, app.hypixelApi, () => app.clusterHelper.getMinecraftBotsUuid())
            }
        })
    }
}
