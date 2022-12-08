const fs = require('fs')

const {REST} = require('@discordjs/rest')
// package can't be installed since it has no exports defined.
// but can be indirectly used through discord.js package
// noinspection NpmUsedModulesInstalled
const {Routes} = require('discord-api-types/v9')
const {Collection} = require("discord.js")
const EventHandler = require("../../common/EventHandler")
const {SCOPE} = require("../../common/ClientInstance")


class CommandManager extends EventHandler {
    #commandsExecutor = new Collection()

    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        let token = this.clientInstance.client.token
        let clientId = this.clientInstance.client.application.id

        let commandsJson = []
        let instanceChoices = this.clientInstance.app.minecraftInstances
            .map(i => i.instanceName)
            .map(choice => ({name: choice, value: choice}))

        fs.readdirSync('./src/discord/commands')
            .filter(file => file.endsWith('Command.js'))
            .forEach(file => {
                let command = require(`./commands/${file}`)

                if (command.allowInstance && instanceChoices.length > 0) {
                    command.data.addStringOption(option =>
                        option.setName("instance")
                            .setDescription("Which instance to send this command to")
                            .setChoices(...instanceChoices))
                }

                commandsJson.push(command.data.toJSON())
                this.#commandsExecutor.set(command.data.name, command)
            })

        this.clientInstance.client.guilds.cache
            .forEach(guild => this.#registerDiscordCommand(token, clientId, guild.id, commandsJson))
        this.clientInstance.client.on('interactionCreate', (...args) => this.#interactionCreate(...args))

        this.clientInstance.logger.debug("CommandManager is registered")
    }

    async #interactionCreate(interaction) {
        if (!interaction.isCommand()) return
        const command = this.#commandsExecutor.get(interaction.commandName)

        try {
            this.clientInstance.app.emit(["discord", "command", interaction.commandName], {
                clientInstance: this.clientInstance,
                scope: SCOPE.PUBLIC,
                username: interaction.member.displayName,
                fullCommand: printCommand(interaction)
            })

            if (!command) {
                this.clientInstance.logger.debug(`${interaction.member.tag} tried to execute command but it doesn't exist: ${printCommand(interaction)}`)

                interaction.reply({
                    content: "Command is not implemented somehow. Maybe there is new version?",
                    ephemeral: true
                })

            } else if (!channelAllowed(this.clientInstance, interaction)) {
                this.clientInstance.logger.debug(`${interaction.member.tag} tried to execute command but denied due to being in wrong channel: ${printCommand(interaction)}`)

                interaction.reply({
                    content: `You can only use commands in public/officer bridge channels!`,
                    ephemeral: true
                })

            } else if (!memberAllowed(this.clientInstance, interaction, command.permission)) {
                this.clientInstance.logger.debug(`${interaction.member.tag} tried to execute command but denied due to permissions: ${printCommand(interaction)}`)

                interaction.reply({
                    content: "You don't have permission to execute this command",
                    ephemeral: true
                })

            } else {
                this.clientInstance.logger.debug(`${interaction.member.tag} executed command: ${printCommand(interaction)}`)

                await command.execute(this.clientInstance, interaction)
            }

        } catch (error) {
            this.clientInstance.logger.error(error)

            if (interaction.deferred || interaction.replied) {
                interaction.editReply({
                    content: 'There was an error while executing command',
                    ephemeral: true
                })

            } else {
                interaction.reply({
                    content: 'There was an error while executing command',
                    ephemeral: true
                })
            }
        }
    }

    #registerDiscordCommand(token, clientId, guildId, commandsJson) {
        // noinspection JSClosureCompilerSyntax
        let rest = new REST().setToken(token)
        // noinspection JSUnresolvedFunction
        return rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commandsJson})
    }

}

const DISCORD_OWNER_ID = process.env.DISCORD_OWNER_ID // owner must be single person
const memberAllowed = function (clientInstance, interaction, permissionLevel) {
    if (permissionLevel === 0) return true
    if (permissionLevel === 1) {
        let hasOfficerRole = interaction.member.roles.cache
            .some(role => clientInstance.officerRoles.some(id => role.id === id))

        if (hasOfficerRole) return true
    }

    return interaction.member.id === DISCORD_OWNER_ID
}

const channelAllowed = function (clientInstance, interaction) {
    return clientInstance.publicChannels.some(id => interaction.channel.id === id)
        || clientInstance.officerChannels.some(id => interaction.channel.id === id)
}

const printCommand = function (interaction) {
    return `${interaction.commandName}`
}

module.exports = {CommandManager, memberAllowed}