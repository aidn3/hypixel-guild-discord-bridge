import DiscordInstance from "../DiscordInstance"
import {escapeDiscord} from "../../../util/DiscordMessageUtil"
import {APIEmbed, CommandInteraction, JSONEncodable, SlashCommandBuilder} from "discord.js"
import {DiscordCommandInterface, Permission} from "../common/DiscordCommandInterface"
import {LOCATION} from "../../../common/ClientInstance"
import {MinecraftRawChatEvent} from "../../../common/ApplicationEvent"
import Application from "../../../Application"
import {Client} from "hypixel-api-reborn"
import {ColorScheme, DefaultCommandFooter} from "../common/DiscordConfig"
import {pageMessage} from "../../../util/DiscordPager"

const mojang = require("mojang")


function createEmbed(instances: Map<string, string[]>): JSONEncodable<APIEmbed>[] {
    let entries: string[] = []
    let total = 0

    for (let [instanceName, list] of instances) {
        total += list.length

        entries.push(`**${escapeDiscord(instanceName)} (${list.length})**\n`)

        if (list.length > 0) {
            for (let user of list) {
                entries.push(user + "\n")
            }
        } else {
            entries.push(`_Could not fetch information from this instance._\n`)
        }

        entries[entries.length - 1] += "\n"
    }

    let pages = []

    const MAX_LENGTH = 3900;
    let currentLength = 0;
    for (let entry of entries) {
        if (pages.length == 0 || currentLength + entry.length > MAX_LENGTH) {
            currentLength = 0

            pages.push({
                color: ColorScheme.DEFAULT,
                title: `Guild Online Players (${total}):`,
                description: "",
                footer: {
                    text: DefaultCommandFooter
                }
            })
        }

        currentLength += entry.length
        pages[pages.length - 1].description += entry
    }

    return pages as any as JSONEncodable<APIEmbed>[]
}

export default <DiscordCommandInterface>{
    commandBuilder: new SlashCommandBuilder()
        .setName('list')
        .setDescription('List Online Players'),
    permission: Permission.ANYONE,

    handler: async function (clientInstance: DiscordInstance, interaction: CommandInteraction) {
        await interaction.deferReply()

        let instancesNames = clientInstance.app.clusterHelper.getInstancesNames(LOCATION.MINECRAFT)
        let lists: Map<string, string[]> = await listMembers(clientInstance.app, clientInstance.app.hypixelApi)

        for (let instancesName of instancesNames) {
            if (!lists.has(instancesName)) lists.set(instancesName, [])
        }

        await pageMessage(interaction, createEmbed(lists))
    }
}

const listMembers = async function (app: Application, hypixelApi: Client): Promise<Map<string, string[]>> {
    let onlineProfiles: Map<string, string[]> = await getOnlineMembers(app)

    for (let [instanceName, members] of onlineProfiles) {
        let fetchedMembers = await look(hypixelApi, unique(members))
        onlineProfiles.set(instanceName, fetchedMembers)
    }

    return onlineProfiles
}

async function look(hypixelApi: Client, members: string[]) {
    let onlineProfiles = await lookupProfiles(members)
        .then(profiles => profiles.sort((a, b) => a.name.localeCompare(b.name)))

    let statuses = await Promise.all(onlineProfiles.map(profile => hypixelApi.getStatus(profile.id)))

    let list = []
    for (let i = 0; i < onlineProfiles.length; i++) {
        list.push(formatLocation(onlineProfiles[i].name, statuses[i]))
    }
    return list
}

// Mojang only allow up to 10 usernames per lookup
async function lookupProfiles(usernames: string[]) {
    let mojangRequests = []

    // https://stackoverflow.com/a/8495740
    let i, j, arr, chunk = 10
    for (i = 0, j = usernames.length; i < j; i += chunk) {
        arr = usernames.slice(i, i + chunk)
        mojangRequests.push(mojang.lookupProfiles(arr))
    }

    let p = await Promise.all(mojangRequests)
    return p.flatMap(arr => arr)
}

function formatLocation(username: string, session: any) {
    let message = `- **${escapeDiscord(username)}** `

    if (!session.online) return message + ` is *__offline?__*`

    message += "*" // START discord markdown. italic
    message += `playing __${escapeDiscord(session.game.name)}__`
    if (session.mode) message += ` in ${escapeDiscord(session.mode.toLowerCase())}`
    message += "*" // END discord markdown. italic

    return message
}

async function getOnlineMembers(app: Application): Promise<Map<string, string[]>> {
    let resolvedNames = new Map<string, string[]>()
    const regexOnline = /(\w{3,16}) \u25CF/g

    const chatListener = function (event: MinecraftRawChatEvent) {
        if (!event.message) return

        let match = regexOnline.exec(event.message)
        while (match != null) {
            let members = resolvedNames.get(event.instanceName)
            if (!members) {
                members = []
                resolvedNames.set(event.instanceName, members)
            }
            members.push(match[1])
            match = regexOnline.exec(event.message)
        }
    }

    app.on("minecraftChat", chatListener)
    app.clusterHelper.sendCommandToAllMinecraft("/guild list")
    await new Promise(r => setTimeout(r, 3000))
    app.removeListener('minecraftChat', chatListener)

    return resolvedNames
}

function unique(list: any[]) {
    return list.filter(function (item, pos) {
        return list.indexOf(item) === pos
    })
}
