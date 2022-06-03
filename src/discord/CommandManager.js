const fs = require('fs')

const {REST} = require('@discordjs/rest')
// package can't be installed since it has no exports defined.
// but can be indirectly used through discord.js package
// noinspection NpmUsedModulesInstalled
const {Routes} = require('discord-api-types/v9')
const {Collection} = require("discord.js")
const EventHandler = require("../common/EventHandler")
const {LOCATION, SCOPE} = require("../metrics/Util")
const CommandMetrics = require("../metrics/CommandMetrics");

const commandsJson = []
const commandsExecutor = new Collection()

fs.readdirSync('./src/discord/commands')
    .filter(file => file.endsWith('Command.js'))
    .forEach(file => {
        let command = require(`./commands/${file}`)
        commandsJson.push(command.data.toJSON())
        commandsExecutor.set(command.data.name, command)
    })

const registerDiscordCommand = function (token, clientId, guildId) {
    // noinspection JSClosureCompilerSyntax
    let rest = new REST().setToken(token)
    return rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commandsJson})
}

class CommandManager extends EventHandler {
    constructor(clientInstance) {
        super(clientInstance)
    }

    registerEvents() {
        let token = this.clientInstance.client.token
        let clientId = this.clientInstance.client.application.id

        this.clientInstance.client.guilds.cache
            .forEach(guild => registerDiscordCommand(token, clientId, guild.id))
        this.clientInstance.client.on('interactionCreate', (...args) => this.#interactionCreate(...args))

        this.clientInstance.logger.debug("CommandManager is registered")
    }

    async #interactionCreate(interaction) {
        if (!interaction.isCommand()) return
        const command = commandsExecutor.get(interaction.commandName)

        try {
            if (!command) {
                this.clientInstance.logger.debug(`${interaction.member.tag} tried to execute command but it doesn't exist: ${printCommand(interaction)}`)

                interaction.reply({
                    content: "Command is not implemented somehow. Maybe there is new version?",
                    ephemeral: true
                })

            } else if (!channelAllowed(interaction)) {
                this.clientInstance.logger.debug(`${interaction.member.tag} tried to execute command but denied due to being in wrong channel: ${printCommand(interaction)}`)

                interaction.reply({
                    content: `You can only use commands in <#${DISCORD_PUBLIC_CHANNEL}>`
                        + ` or in <#${DISCORD_OFFICER_CHANNEL}>`,
                    ephemeral: true
                })

            } else if (!memberAllowed(interaction, command.permission)) {
                this.clientInstance.logger.debug(`${interaction.member.tag} tried to execute command but denied due to permissions: ${printCommand(interaction)}`)

                interaction.reply({
                    content: "You don't have permission to execute this command",
                    ephemeral: true
                })

            } else {
                this.clientInstance.logger.debug(`${interaction.member.tag} executed command: ${printCommand(interaction)}`)
                CommandMetrics(LOCATION.DISCORD, SCOPE.PUBLIC, this.clientInstance.instanceName, interaction.commandName)

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
}

const DISCORD_OWNER_ID = process.env.DISCORD_OWNER_ID
const DISCORD_COMMAND_ROLE = process.env.DISCORD_COMMAND_ROLE
const memberAllowed = function (interaction, permissionLevel) {
    if (permissionLevel === 0) return true
    if (permissionLevel === 1
        && interaction.member.roles.cache.some(role => role.id === DISCORD_COMMAND_ROLE)) return true

    return interaction.member.id === DISCORD_OWNER_ID
}

const DISCORD_PUBLIC_CHANNEL = process.env.DISCORD_PUBLIC_CHANNEL
const DISCORD_OFFICER_CHANNEL = process.env.DISCORD_OFFICER_CHANNEL
const channelAllowed = function (interaction) {
    return interaction.channel.id === DISCORD_PUBLIC_CHANNEL
        || interaction.channel.id === DISCORD_OFFICER_CHANNEL
}

const printCommand = function (interaction) {
    return `${interaction.commandName}`
}

module.exports = {CommandManager, memberAllowed}