import Application from "../../Application"
import {GatewayIntentBits, TextBasedChannelFields, TextChannel} from 'discord.js'

import {ClientInstance, LOCATION, SCOPE, Status} from "../../common/ClientInstance"
import StateHandler from "./handlers/StateHandler"

import ChatManager from "./ChatManager"
import {CommandManager} from './CommandManager'
import {escapeDiscord} from "../../util/DiscordMessageUtil"
import {ChatEvent, ClientEvent, EventType, InstanceEvent, InstanceEventType} from "../../common/ApplicationEvent"
import {ColorScheme, DiscordConfig} from "./common/DiscordConfig";
import DiscordLight = require('discord.js-light');


export default class DiscordInstance extends ClientInstance<DiscordConfig> {
    private readonly handlers

    readonly client: DiscordLight.Client

    constructor(app: Application, instanceName: string, config: DiscordConfig) {
        super(app, instanceName, LOCATION.DISCORD, config)
        this.status = Status.FRESH

        this.client = new DiscordLight.Client({
            makeCache: DiscordLight.Options.cacheEverything(),
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
        })

        this.handlers = [
            new StateHandler(this),
            new ChatManager(this),
            new CommandManager(this),
        ]

        if (!this.config.publicChannelIds)
            this.logger.info("no Discord public channels found")

        if (!this.config.officerChannelIds)
            this.logger.info("no Discord officer channels found")

        if (!this.config.officerRoleIds)
            this.logger.info("no Discord officer roles found")


        this.app.on("chat", async (event: ChatEvent) => this.onChat(event))
        this.app.on("event", async (event: ClientEvent) => this.onEvent(event))
        this.app.on("instance", async (event: InstanceEvent) => this.onInstance(event))
    }

    async connect() {
        this.handlers.forEach(handler => handler.registerEvents())
        await this.client.login(this.config.key)
    }

    private async onChat(event: ChatEvent) {
        // webhooks received in same channel
        if (event.location === LOCATION.WEBHOOK) return


        let channels
        if (event.scope === SCOPE.PUBLIC) channels = this.config.publicChannelIds
        else if (event.scope === SCOPE.OFFICER) channels = this.config.officerChannelIds
        else return

        for (const _channelId of channels) {
            if (_channelId === event.channelId) continue

            let webhook = await this.getWebhook(_channelId)
            let displayUsername = event.replyUsername ? `${event.username}⇾${event.replyUsername}` : event.username

            //TODO: integrate instanceName
            await webhook.send({
                // TODO: Restore to original after bug #34 has been fixed by discord
                content: `${escapeDiscord(displayUsername)}: ${escapeDiscord(event.message)}`,
                //content: escapeDiscord(event.message),
                username: displayUsername,
                avatarURL: `https://mc-heads.net/avatar/${encodeURIComponent(event.username)}`
            })
        }
    }

    private lastRepeatEvent = 0
    private lastBlockEvent = 0

    private async onEvent(event: ClientEvent) {
        if (event.instanceName === this.instanceName) return

        if (event.name === EventType.REPEAT) {
            if (this.lastRepeatEvent + 5000 < new Date().getTime()) {
                this.lastRepeatEvent = new Date().getTime()
            } else {
                return
            }
        }
        if (event.name === EventType.BLOCK) {
            if (this.lastBlockEvent + 5000 < new Date().getTime()) {
                this.lastBlockEvent = new Date().getTime()
            } else {
                return
            }
        }

        let channels
        if (event.scope === SCOPE.PUBLIC) channels = this.config.publicChannelIds
        else if (event.scope === SCOPE.OFFICER) channels = this.config.officerChannelIds
        else return

        for (const channelId of channels) {
            let channel = <TextChannel><unknown>await this.client.channels.fetch(channelId)
            if (!channel) return

            let embed = {
                description: escapeDiscord(event.message),

                color: event.severity,
                footer: {
                    text: event.instanceName
                }
            }
            if (event.username) {
                let extra = {
                    title: escapeDiscord(event.username),
                    url: `https:\/\/sky.shiiyu.moe\/stats\/${encodeURIComponent(event.username)}`,
                    thumbnail: {url: `https://cravatar.eu/helmavatar/${encodeURIComponent(event.username)}.png`}
                }
                Object.assign(embed, extra)
            }

            let resP = channel.send({embeds: [<any>embed]})

            if (event.removeLater) {
                let deleteAfter = this.config.deleteTempEventAfter
                setTimeout(() => resP.then(res => res.delete()), deleteAfter * 60 * 1000)
            }
        }
    }

    private async onInstance(event: InstanceEvent) {
        if (event.instanceName === this.instanceName) return

        for (const channelId of this.config.publicChannelIds) {
            let channel = <TextChannel><unknown>await this.client.channels.fetch(channelId)
            if (!channel) continue

            channel.send({
                embeds: [{
                    title: escapeDiscord(event.instanceName),
                    description: event.message ? escapeDiscord(event.message) : escapeDiscord(Object.keys(InstanceEventType)[event.type]),
                    color: ColorScheme.INFO
                }]
            }).then(undefined)
        }
    }

    private async getWebhook(channelId: string) {
        if (!this.client) throw new Error("Client not defined.")

        let channel = <TextBasedChannelFields | undefined><unknown>await this.client.channels.fetch(channelId)
        if (!channel) throw new Error(`no access to channel ${channelId}?`)
        let webhooks = await channel.fetchWebhooks()

        let webhook = webhooks.find(h => h.owner?.id === this.client.user?.id)
        if (!webhook) webhook = await channel.createWebhook({name: 'Hypixel-Guild-Bridge'})
        return webhook
    }
}
