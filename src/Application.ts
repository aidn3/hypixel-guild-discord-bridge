import fs = require("fs")
import MineFlayer = require('mineflayer')
import {TypedEmitter} from 'tiny-typed-emitter'
import {Client as HypixelClient} from 'hypixel-api-reborn'
import * as Discord from "discord.js-light"
import DiscordInstance from "./instance/discord/DiscordInstance"
import MinecraftInstance from "./instance/minecraft/MinecraftInstance"
import GlobalChatInstance from "./instance/globalChat/GlobalChatInstance"
import WebhookInstance from "./instance/webhook/WebhookInstance"
import {PunishedUsers} from "./util/PunishedUsers"
import {
    ChatEvent,
    ClientEvent,
    CommandEvent,
    InstanceEvent, InstanceRestartSignal,
    InstanceSelfBroadcast,
    MinecraftRawChatEvent,
    MinecraftSelfBroadcast,
    MinecraftSendChat
} from "./common/ApplicationEvent"
import {ClientInstance} from "./common/ClientInstance"
import PluginInterface from "./common/PluginInterface"
import MetricsInstance from "./instance/metrics/MetricsInstance"
import ClusterHelper from "./ClusterHelper"
import * as Events from "events";
import {getLogger, Logger} from "log4js";

const DISCORD_CONFIG = require("../config/discord-config.json")
const MINECRAFT_CONFIG = require("../config/minecraft-config.json")
const GLOBAL_CHAT_CONFIG = require("../config/global-chat-config.json")
bad#();de.
const HYPIXEL_KEY = <string>process.env.HYPIXEL_KEY

export default class Application extends TypedEmitter<ApplicationEvents> {

    private readonly logger: Logger
    private readonly instances: ClientInstance[] = []
    private readonly plugins: PluginInterface[] = []

    readonly clusterHelper: ClusterHelper
    readonly punishedUsers: PunishedUsers
    readonly hypixelApi: HypixelClient

    constructor() {
        super()
        this.logger = getLogger("Application")
        emitAll(this) // first thing to redirect all events

        this.hypixelApi = new HypixelClient(HYPIXEL_KEY, {cache: true, cacheTime: 300})
        this.punishedUsers = new PunishedUsers()
        this.clusterHelper = new ClusterHelper(this)

        let discordInstance = new DiscordInstance(this, "DC", DISCORD_CONFIG)
        this.instances.push(discordInstance)

        this.instances.push(new GlobalChatInstance(this, "GLOBAL", GLOBAL_CHAT_CONFIG))
        this.instances.push(...Application.parseWebhooks(this, discordInstance.client))
        this.instances.push(...Application.parseMinecraft(this))
        this.instances.push(new MetricsInstance(this, "prometheus"))

        this.plugins = fs.readdirSync('./src/plugins/')
            .filter(file => file.endsWith('Plugin.ts'))
            .map(f => {
                this.logger.trace(`Loading Plugin ${f}`)
                return require(`./plugins/${f}`).default
            })
    }

    async sendConnectSignal() {
        this.broadcastLocalInstances()

        // only shared with plugins to directly modify instances
        // everything else is encapsulated
        let getLocalInstance = (instanceName: string): ClientInstance | undefined => {
            return this.instances.find(i => i.instanceName === instanceName)
        }

        this.logger.debug("Sending signal to all plugins")
        this.plugins.forEach(p => p.onRun(this, getLocalInstance))

        for (let instance of this.instances) {
            this.logger.debug(`Connecting instance ${instance.instanceName}`)
            await instance.connect()
        }
    }

    public broadcastLocalInstances(): void {
        this.logger.debug("Informing instances of each other")

        for (let instance of this.instances) {
            this.emit("selfBroadcast", <InstanceSelfBroadcast>{
                instanceName: instance.instanceName,
                location: instance.location
            })
        }
    }

    private static parseMinecraft(app: Application): ClientInstance[] {
        let instances: ClientInstance[] = []

        for (let [key, value] of Object.entries(process.env)) {
            if (!key.startsWith("MINECRAFT_")) continue

            let account = (<string>value).split(",")
            let options = {
                auth: <string>account.shift(),
                username: <string>account.shift(),
                password: <string>account.join(","),
            }

            Object.assign(options, MINECRAFT_CONFIG.server)
            let instanceName = key.replace("MINECRAFT_", "")

            let instance = new MinecraftInstance(
                app,
                instanceName,
                <Partial<MineFlayer.BotOptions>>options
            )

            instances.push(instance)
        }

        return instances
    }

    private static parseWebhooks(app: Application, discordClient: Discord.Client): WebhookInstance[] {
        let webhooks: WebhookInstance[] = []

        for (let [key, value] of Object.entries(process.env)) {
            if (!key.startsWith("WEBHOOK_")) continue

            let webhookInfo = (<string>value).split(",")
            let webhookSendUrl = webhookInfo[1]
            let webhookReceiveId = webhookInfo[0]
            let instanceName = key.replace("WEBHOOK_", "")

            let instance = new WebhookInstance(
                app,
                instanceName,
                discordClient,
                webhookSendUrl,
                webhookReceiveId
            )

            webhooks.push(instance)
        }

        return webhooks
    }
}

function emitAll(emitter: Events): void {
    let old = emitter.emit
    emitter.emit = (event: string, ...args: Parameters<any>): boolean => {
        if (event !== "*") emitter.emit("*", event, ...args)
        return old.call(emitter, event, ...args)
    }
}

export interface ApplicationEvents {
    /**
     * Receive all events
     * @param event event name
     * @param args event arguments
     */
    '*': (event: string, ...args: any) => void

    /**
     * User sending messages
     */
    'chat': (event: ChatEvent) => void
    /**
     * User join/leave/offline/online/mute/kick/etc
     */
    'event': (event: ClientEvent) => void
    /**
     * User executing a command
     */
    'command': (event: CommandEvent) => void
    /**
     * Internal instance start/connect/disconnect/etc
     */
    'instance': (event: InstanceEvent) => void

    /**
     * Broadcast instance to inform other applications nodes in cluster about its existence
     */
    'selfBroadcast': (event: InstanceSelfBroadcast) => void
    /**
     * Command used to restart an instance
     */
    'restartSignal': (event: InstanceRestartSignal) => void

    /**
     * Used to broadcast which in-game username/uuid belongs to which bot.
     * Useful to distinguish in-game between players and bots
     */
    'minecraftSelfBroadcast': (event: MinecraftSelfBroadcast) => void
    /**
     * Minecraft instance raw chat
     */
    'minecraftChat': (event: MinecraftRawChatEvent) => void
    /**
     * Command used to send a chat message/command through a minecraft instance
     */
    'minecraftSend': (event: MinecraftSendChat) => void
}
