const logger = require("log4js").getLogger("FragbotPlugin")
const Mojang = require("mojang")
const repartyWhitelist = new (require("node-cache"))({stdTTL: 30}) // 30 second
const CONFIG = require("../../config/fragbot-config.json")


function partyDisband(message) {
    const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has disbanded the party!$/g

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]

        logger.debug(`${username} has disbanded the party. Adding them to reparty whitelist...`)
        repartyWhitelist.set(username, true)
    }
}

function autoLeave(clientInstance, username) {
    logger.debug(`auto leaving party if not confirmed to stay by re-partying or typing the code word`)

    setTimeout(() => {
        if (!repartyWhitelist.get(username)) {
            logger.debug(`Time out. Leaving ${username}'s party...`)
            clientInstance.send(`/party leave`)

        } else {
            logger.debug(`Party leaving is aborted for ${username}`)
        }
    }, CONFIG.autoLeavePartyAfter)
}

async function isGuildMember(username, hypixelApi, instances) {
    if (!CONFIG.whitelistGuild) return false

    let uuid = await Mojang.lookupProfileAt(username).then(res => res.id.toString())

    let members = await hypixelApi.getGuild("player", uuid, null)
        .then(res => res.members)

    // bot in same guild
    return members.some(member => instances.some(i => i.uuid() === member.uuid))
}

async function partyInvite(clientInstance, application, message) {
    const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has invited you to join their party!$/gm

    let match = regex.exec(message)
    if (match != null) {
        let username = match[1]
        logger.debug(`${username} has sent a party invite`)

        if (repartyWhitelist.get(username)) {
            logger.debug(`auto accepting ${username}'s party since it is a reparty`)
            clientInstance.send(`/party accept ${username}`)

        } else if (CONFIG.whitelisted.some((p => p.toLowerCase().trim() === username.toLowerCase().trim()))) {
            logger.debug(`accepting ${username}'s party since they are whitelisted`)
            clientInstance.send(`/party accept ${username}`)
            autoLeave(clientInstance, username)

        } else if (await isGuildMember(username, application.hypixelApi, application.minecraftInstances)) {
            logger.debug(`accepting ${username}'s party since they are from the same guild`)
            clientInstance.send(`/party accept ${username}`)
            autoLeave(clientInstance, username)

        } else {
            logger.debug(`ignoring ${username}'s party...`)
        }

        return true
    }
}


module.exports = (application) => {
    application.on("minecraft.client.create", ({clientInstance}) => {
        clientInstance.client.on('message', async (args) => {
            let message = args.toString().trim()

            partyDisband(message)
            await partyInvite(clientInstance, application, message)
        })
    })
}
