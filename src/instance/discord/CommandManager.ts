import * as assert from 'node:assert'
import {
  BaseInteraction,
  ChatInputCommandInteraction,
  Collection,
  CommandInteraction,
  GuildMember,
  GuildMemberRoleManager,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes
} from 'discord.js'

import EventHandler from '../../common/EventHandler'
import { LOCATION, SCOPE } from '../../common/ClientInstance'
import DiscordInstance from './DiscordInstance'
import { DiscordCommandInterface, Permission } from './common/DiscordCommandInterface'

import AboutCommand from './commands/AboutCommand'
import AcceptCommand from './commands/AcceptCommand'
import DemoteCommand from './commands/DemoteCommand'
import InviteCommand from './commands/InviteCommand'
import KickCommand from './commands/KickCommand'
import ListCommand from './commands/ListCommand'
import MuteCommand from './commands/MuteCommand'
import OverrideCommand from './commands/OverrideCommand'
import PingCommand from './commands/PingCommand'
import PromoteCommand from './commands/PromoteCommand'
import RestartCommand from './commands/RestartCommand'
import SetrankCommand from './commands/SetrankCommand'
import ShutdownCommand from './commands/ShutdownCommand'
import UnmuteCommand from './commands/UnmuteCommand'

export class CommandManager extends EventHandler<DiscordInstance> {
  private readonly commands = new Collection<string, DiscordCommandInterface>()

  constructor(discordInstance: DiscordInstance) {
    super(discordInstance)

    this.addDefaultCommands()

    let timeoutId: undefined | NodeJS.Timeout
    const timerReset = (): void => {
      if (timeoutId != undefined) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        this.registerDiscordCommand()
      }, 5 * 1000)
    }
    this.clientInstance.app.on('minecraftSelfBroadcast', (): void => {
      timerReset()
    })
    this.clientInstance.app.on('selfBroadcast', (event): void => {
      if (event.location === LOCATION.MINECRAFT) {
        timerReset()
      }
    })
    timerReset()
  }

  registerEvents(): void {
    this.clientInstance.client.on('interactionCreate', (interaction) => {
      void this.interactionCreate(interaction)
    })
    this.clientInstance.logger.debug('CommandManager is registered')
  }

  private addDefaultCommands(): void {
    const toAdd = [
      AboutCommand,
      AcceptCommand,
      DemoteCommand,
      InviteCommand,
      KickCommand,
      ListCommand,
      MuteCommand,
      OverrideCommand,
      PingCommand,
      PromoteCommand,
      RestartCommand,
      SetrankCommand,
      ShutdownCommand,
      UnmuteCommand
    ]

    for (const command of toAdd) {
      this.commands.set(command.getCommandBuilder().name, command)
    }
  }

  private async interactionCreate(interaction: BaseInteraction): Promise<void> {
    if (!interaction.isCommand()) return

    this.clientInstance.logger.debug(`${interaction.user.tag} executing ${interaction.commandName}`)
    const command = this.commands.get(interaction.commandName)

    try {
      if (command == undefined) {
        this.clientInstance.logger.debug(`command but it doesn't exist: ${interaction.commandName}`)

        await interaction.reply({
          content: 'Command is not implemented somehow. Maybe there is new version?',
          ephemeral: true
        })
        return
      } else if (!this.channelAllowed(interaction)) {
        this.clientInstance.logger.debug(`can't execute in channel ${interaction.channelId}`)

        await interaction.reply({
          content: 'You can only use commands in public/officer bridge channels!',
          ephemeral: true
        })
        return
      } else if (this.memberAllowed(interaction, command.permission)) {
        this.clientInstance.logger.debug('execution granted.')

        const username =
          interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.displayName

        this.clientInstance.app.emit('command', {
          localEvent: true,
          instanceName: this.clientInstance.instanceName,
          location: LOCATION.DISCORD,
          scope: SCOPE.PUBLIC,
          username,
          fullCommand: interaction.command?.options.toString() ?? '',
          commandName: interaction.commandName
        })

        return command.handler(this.clientInstance, interaction as ChatInputCommandInteraction)
      } else {
        this.clientInstance.logger.debug('No permission to execute this command')

        await interaction.reply({
          content: "You don't have permission to execute this command",
          ephemeral: true
        })
        return
      }
    } catch (error) {
      this.clientInstance.logger.error(error)

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: 'There was an error while executing command'
        })
        return
      } else {
        await interaction.reply({
          content: 'There was an error while executing command',
          ephemeral: true
        })
        return
      }
    }
  }

  private registerDiscordCommand(): void {
    this.clientInstance.logger.debug('Registering commands')
    assert(this.clientInstance.client.token)
    assert(this.clientInstance.client.application)

    const token = this.clientInstance.client.token
    const clientId = this.clientInstance.client.application.id
    const commandsJson = this.getCommandsJson()

    for (const guild of this.clientInstance.client.guilds.cache) {
      this.clientInstance.logger.debug(`Informing guild ${guild.id} about commands`)
      const rest = new REST().setToken(token)
      void rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commandsJson })
    }
  }

  private memberAllowed(interaction: CommandInteraction, permissionLevel: Permission): boolean {
    if (permissionLevel === Permission.ANYONE || interaction.user.id === this.clientInstance.config.adminId) return true

    const roles = interaction.member?.roles as GuildMemberRoleManager | undefined
    if (roles == undefined) return false

    let highestPerm = Permission.ANYONE
    if (roles.cache.some((role) => this.clientInstance.config.helperRoleIds?.some((id) => role.id === id))) {
      highestPerm = Permission.HELPER
    }
    if (roles.cache.some((role) => this.clientInstance.config.officerRoleIds.includes(role.id))) {
      highestPerm = Permission.OFFICER
    }

    return highestPerm >= permissionLevel
  }

  private channelAllowed(interaction: CommandInteraction): boolean {
    return (
      this.clientInstance.config.publicChannelIds.includes(interaction.channelId) ||
      this.clientInstance.config.officerChannelIds.includes(interaction.channelId)
    )
  }

  private getCommandsJson(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    const commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    const instanceChoices = this.clientInstance.app.clusterHelper
      .getInstancesNames(LOCATION.MINECRAFT)
      .map((choice: string) => ({ name: choice, value: choice }))

    for (const command of this.commands.values()) {
      const commandBuilder = command.getCommandBuilder()
      if (command.allowInstance && instanceChoices.length > 0) {
        commandBuilder.addStringOption((option) =>
          option
            .setName('instance')
            .setDescription('Which instance to send this command to')
            .setChoices(...instanceChoices)
        )
      }

      commandsJson.push(commandBuilder.toJSON())
    }

    return commandsJson
  }
}
