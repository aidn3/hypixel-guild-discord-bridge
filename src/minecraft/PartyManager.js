const EventHandler = require('../common/EventHandler')
const logger = require("log4js").getLogger("MC-Party-Handler")

const RepartyCache = new (require("node-cache"))({stdTTL: 30}) // 30 second
const MINECRAFT_CONFIG = require("../../config/minecraft-config.json")
const WHITELISTED = process.env.HYPIXEL_PARTY_WHITELIST.split(",")

class PartyManager extends EventHandler {
    #hypixelGuild;

    constructor(clientInstance, hypixelGuild) {
        super(clientInstance)
        this.#hypixelGuild = hypixelGuild
    }

    registerEvents() {
        this.clientInstance.client.on('message', (...args) => this.#onMessage(...args))
    }

    async #onMessage(event) {
        const message = event.toString().trim()

        await this.#isPartyInvite(message)
        PartyManager.#isPartyDisband(message)
        PartyManager.#isPartyStayRequest(message)
    }

    async #isPartyInvite(message) {
        const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has invited you to join their party!$/gm

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            logger.debug(`${username} has sent a party invite`)

            if (RepartyCache.get(username)) {
                logger.debug(`auto accepting ${username}'s party since it is a reparty`)
                this.clientInstance.send(`/party accept ${username}`)

            } else if (WHITELISTED.some((p => p.toLowerCase().trim() === username.toLowerCase().trim()))) {
                logger.debug(`accepting ${username}'s party since they are whitelisted`)
                this.clientInstance.send(`/party accept ${username}`)
                this.#autoLeave(username)

            } else if (await this.#hypixelGuild.isGuildMember(username)) {
                logger.debug(`accepting ${username}'s party since they are from the same guild`)
                this.clientInstance.send(`/party accept ${username}`)
                this.#autoLeave(username)

            } else {
                logger.debug(`ignoring ${username}'s party...`)
            }

            return true
        }
    }

    #autoLeave(username) {
        logger.debug(`auto leaving party if not confirmed to stay by repartying or typing the code word`)
        setTimeout(() => {
            if (!RepartyCache.get(username)) {
                logger.debug(`Time out. Leaving ${username}'s party...`)
                this.clientInstance.send(`/party leave`)

            } else {
                logger.debug(`Party leaving is aborted for ${username}`)
            }
        }, MINECRAFT_CONFIG.commands.autoLeavePartyAfter)
    }

    static #isPartyDisband(message) {
        const regex = /^(?:\[[A-Z+]{3,10}\] )?(\w{3,32}) has disbanded the party!$/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            logger.debug(`${username} has disbanded the party. Adding them to reparty whitelist...`)
            RepartyCache.set(username, true)
            return true
        }
    }

    static #isPartyStayRequest(message) {
        let regex = /^Party > (?:\[[A-Z+]{1,10}\] ){0,3}(\w{3,32})(?: \[[[A-Za-z0-9_]{1,10}\]){0,3}: ALLOW/g

        let match = regex.exec(message)
        if (match != null) {
            let username = match[1]
            logger.debug(`${username} has requested to stay in the party. Adding them to reparty whitelist...`)
            RepartyCache.set(username, true)
            return true
        }
    }
}

module.exports = PartyManager
