const Discord = require('discord.js-light')
const {Intents} = require('discord.js')

const ClientInstance = require("../common/ClientInstance")
const Status = require("../common/Status")
const StateHandler = require("./handlers/StateHandler")
const ChatManager = require("./ChatManager")
const {CommandManager} = require('./CommandManager')


const DISCORD_KEY = process.env.DISCORD_KEY

class DiscordInstance extends ClientInstance {
    client;
    status;
    #cacheOptions;
    #handlers;

    constructor(instanceName, bridge, cacheOptions) {
        super(instanceName, bridge)

        this.#cacheOptions = cacheOptions
        this.client = null
        this.status = Status.FRESH
        this.#handlers = [
            new StateHandler(this),
            new ChatManager(this),
            new CommandManager(this),
        ]
    }

    connect() {
        this.client = new Discord.Client({
            makeCache: Discord.Options.cacheWithLimits(this.#cacheOptions),
            intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
        })

        this.client.login(DISCORD_KEY)
            .then(() => this.#handlers.forEach(handler => handler.registerEvents()))
            .catch(error => {
                this.logger.fatal(error)
                this.logger.warn("stopping the process node for the controller to restart this node...")
                process.exitCode = 1
            })
    }
}

module.exports = DiscordInstance