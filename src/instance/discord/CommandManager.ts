import fs = require('fs')
import {
    REST, Routes,
    Collection,
    CommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody, GuildMember, GuildMemberRoleManager
} from "discord.js"

import EventHandler from "../../common/EventHandler"
import {LOCATION, SCOPE} from "../../common/ClientInstance"
import DiscordInstance from "./DiscordInstance"
import {DiscordCommandInterface, Permission} from "./common/DiscordCommandInterface"

const DISCORD_OWNER_ID = process.env.DISCORD_OWNER_ID // owner must be single person

export class CommandManager extends EventHandler<DiscordInstance> {
    private readonly commands = new Collection<string, DiscordCommandInterface>()

    constructor(clientInstance: DiscordInstance) {
        super(clientInstance)
    }

    registerEvents() {
        let token = <string>this.clientInstance.client.token
        let clientId = <string>this.clientInstance.client.application?.id

        let commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
        let instanceChoices = []
            .map((choice: string) => ({name: choice, value: choice}))

        let commandPath = './src/instance/discord/commands'
        fs.readdirSync(commandPath)
            .filter((file: string) => file.endsWith('Command.ts'))
            .forEach((file: string) => {
                let filePath = `./commands/${file}`
                console.log(filePath)
                let command = <DiscordCommandInterface>require(filePath).default

                if (command.allowInstance && instanceChoices.length > 0) {
                    command.commandBuilder.addStringOption((option) =>
                        option.setName("instance")
                            .setDescription("Which instance to send this command to")
                            .setChoices(...instanceChoices))
                }

                commandsJson.push(command.commandBuilder.toJSON())
                this.commands.set(command.commandBuilder.name, command)
            })

        this.clientInstance.client.guilds.cache
            .forEach(guild => CommandManager.registerDiscordCommand(token, clientId, guild.id, commandsJson))
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

    private static registerDiscordCommand(token: string, clientId: string, guildId: string, commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[]) {
        let rest = new REST().setToken(token)
        return rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commandsJson})
    }

    private memberAllowed(interaction: CommandInteraction, permissionLevel: number) {
        if (permissionLevel === Permission.ANYONE) return true

        if (permissionLevel === Permission.STAFF) {
            let roles = <GuildMemberRoleManager>interaction.member?.roles
            if (roles) {
                let hasOfficerRole = roles.cache.some((role) => this.clientInstance.officerRoles.some(id => role.id === id))
                if (hasOfficerRole) return true
            }
        }

        return interaction.user.id === DISCORD_OWNER_ID
    }

    private channelAllowed(interaction: CommandInteraction) {
        return this.clientInstance.publicChannels.some(id => interaction.channelId === id)
            || this.clientInstance.officerChannels.some(id => interaction.channelId === id)
    }
}
