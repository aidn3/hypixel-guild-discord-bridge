import fs = require("fs")
import {TypedEmitter} from 'tiny-typed-emitter'
import {Client as HypixelClient} from 'hypixel-api-reborn'
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
import {ApplicationConfig, loadApplicationConfig} from "./ApplicationConfig";


export default class Application extends TypedEmitter<ApplicationEvents> {

    private readonly logger: Logger
    private readonly instances: ClientInstance[] = []
    private readonly plugins: PluginInterface[] = []

    readonly clusterHelper: ClusterHelper
    readonly punishedUsers: PunishedUsers
    readonly hypixelApi: HypixelClient
    readonly config: ApplicationConfig

    constructor() {
        super()
        this.logger = getLogger("Application")
        emitAll(this) // first thing to redirect all events

        this.config = loadApplicationConfig()

        this.hypixelApi = new HypixelClient(this.config.general.hypixelApiKey, {cache: true, cacheTime: 300})
        this.punishedUsers = new PunishedUsers()
        this.clusterHelper = new ClusterHelper(this)

        if (this.config.discord) {
            let discordInstance = new DiscordInstance(this, this.config.discord.instanceName, this.config.discord)
            this.instances.push(discordInstance)

            for (let instanceConfig of this.config.webhooks) {
                this.instances.push(new WebhookInstance(this, instanceConfig.instanceName, discordInstance.client, instanceConfig))
            }
        }

        if (this.config.global.enabled) {
            this.instances.push(new GlobalChatInstance(this, this.config.global.instanceName, this.config.global))
        }

        for (let instanceConfig of this.config.minecrafts) {
            this.instances.push(new MinecraftInstance(this, instanceConfig.instanceName, instanceConfig))
        }

        if (this.config.metrics.enabled) {
            this.instances.push(new MetricsInstance(this, this.config.metrics.instanceName, this.config.metrics))
        }

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
