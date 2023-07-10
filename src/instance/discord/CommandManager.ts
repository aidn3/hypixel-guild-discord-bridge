import fs = require('fs');
import {
    Collection,
    CommandInteraction,
    GuildMember,
    GuildMemberRoleManager,
    REST,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes
} from "discord.js"

import EventHandler from "../../common/EventHandler"
import {LOCATION, SCOPE} from "../../common/ClientInstance"
import DiscordInstance from "./DiscordInstance"
import {DiscordCommandInterface, Permission} from "./common/DiscordCommandInterface"


export class CommandManager extends EventHandler<DiscordInstance> {
    private readonly commands = new Collection<string, DiscordCommandInterface>()

    constructor(clientInstance: DiscordInstance) {
        super(clientInstance)
    }

    registerEvents() {
        let commandPath = './src/instance/discord/commands'
        fs.readdirSync(commandPath)
            .filter((file: string) => file.endsWith('Command.ts'))
            .forEach((file: string) => {
                let filePath = `./commands/${file}`
                this.clientInstance.logger.debug(`Loading command ${filePath}`)
                let command = <DiscordCommandInterface>require(filePath).default

                this.commands.set(command.commandBuilder.name, command)
            })

        let timeoutId: null | NodeJS.Timeout = null
        this.clientInstance.app.on("minecraftSelfBroadcast", event => {
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => this.registerDiscordCommand(), 5 * 1000)
        })

        this.clientInstance.client.on('interactionCreate', (interaction) => this.interactionCreate(interaction))
        this.clientInstance.logger.debug("CommandManager is registered")
    }

    private interactionCreate(interaction_: any): Promise<any> | undefined {
        if (!interaction_.isCommand()) return
        let interaction = <CommandInteraction>interaction_

        this.clientInstance.logger.debug(`${interaction.user.tag} executing ${interaction.commandName}`)
        const command = this.commands.get(interaction.commandName)

        try {
            if (!command) {
                this.clientInstance.logger.debug(`command but it doesn't exist: ${interaction.commandName}`)

                return interaction.reply({
                    content: "Command is not implemented somehow. Maybe there is new version?",
                    ephemeral: true
                })

            } else if (!this.channelAllowed(interaction)) {
                this.clientInstance.logger.debug(`can't execute in channel ${interaction.channelId}`)

                return interaction.reply({
                    content: `You can only use commands in public/officer bridge channels!`,
                    ephemeral: true
                })

            } else if (!this.memberAllowed(interaction, command.permission)) {
                this.clientInstance.logger.debug(`No permission to execute this command`)

                return interaction.reply({
                    content: "You don't have permission to execute this command",
                    ephemeral: true
                })

            } else {
                this.clientInstance.logger.debug(`execution granted.`)

                this.clientInstance.app.emit("command", {
                    localEvent: true,
                    instanceName: this.clientInstance.instanceName,
                    location: LOCATION.DISCORD,
                    scope: SCOPE.PUBLIC,
                    username: (<GuildMember>interaction?.member)?.displayName || interaction.user.username,
                    fullCommand: interaction.command?.options.toString() || "",
                    commandName: interaction.commandName,
                })

                return command.handler(this.clientInstance, interaction)
            }

        } catch (error) {
            this.clientInstance.logger.error(error)

            if (interaction.deferred || interaction.replied) {
                return interaction.editReply({
                    content: 'There was an error while executing command'
                })

            } else {
                return interaction.reply({
                    content: 'There was an error while executing command',
                    ephemeral: true
                })
            }
        }
    }

    private registerDiscordCommand() {
        this.clientInstance.logger.debug(`Registering commands`)
        const token = <string>this.clientInstance.client.token
        const clientId = <string>this.clientInstance.client.application?.id
        const commandsJson = this.getCommandsJson()


        this.clientInstance.client.guilds.cache.forEach(guild => {
            this.clientInstance.logger.debug(`Informing guild ${guild.id} about commands`)
            let rest = new REST().setToken(token)
            return rest.put(Routes.applicationGuildCommands(clientId, guild.id), {body: commandsJson})
        })
    }

    private memberAllowed(interaction: CommandInteraction, permissionLevel: number) {
        if (permissionLevel === Permission.ANYONE) return true

        if (permissionLevel === Permission.STAFF) {
            let roles = <GuildMemberRoleManager>interaction.member?.roles
            if (roles) {
                let hasOfficerRole = roles.cache.some((role) => {
                    return this.clientInstance.config.officerRoleIds.some(id => role.id === id)
                })
                if (hasOfficerRole) return true
            }
        }

        return interaction.user.id === this.clientInstance.config.adminId
    }

    private channelAllowed(interaction: CommandInteraction) {
        return this.clientInstance.config.publicChannelIds.some(id => interaction.channelId === id)
            || this.clientInstance.config.officerChannelIds.some(id => interaction.channelId === id)
    }

    private getCommandsJson() {
        let commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
        let instanceChoices = this.clientInstance.app
            .clusterHelper.getInstancesNames(LOCATION.MINECRAFT)
            .map((choice: string) => ({name: choice, value: choice}))

        for (let command of this.commands.values()) {
            if (command.allowInstance && instanceChoices.length > 0) {
                command.commandBuilder.addStringOption((option) =>
                    option.setName("instance")
                        .setDescription("Which instance to send this command to")
                        .setChoices(...instanceChoices))
            }

            commandsJson.push(command.commandBuilder.toJSON())
        }

        return commandsJson
    }
}
