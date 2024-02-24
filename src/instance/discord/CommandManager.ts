import assert from 'node:assert'
import type {
  BaseInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  GuildMemberRoleManager,
  RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js'
import { Collection, GuildMember, REST, Routes } from 'discord.js'

import EventHandler from '../../common/EventHandler'
import { ChannelType, InstanceType } from '../../common/ApplicationEvent'
import type DiscordInstance from './DiscordInstance'
import type { DiscordCommandInterface } from './common/DiscordCommandInterface'
import { Permission } from './common/DiscordCommandInterface'

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
import ReconnectCommand from './commands/ReconnectCommand'
import SetrankCommand from './commands/SetrankCommand'
import RestartCommand from './commands/RestartCommand'
import UnmuteCommand from './commands/UnmuteCommand'
import ConnectivityCommand from './commands/ConnectivityCommand'
import LogCommand from './commands/LogCommand'

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
      if (event.instanceType === InstanceType.MINECRAFT) {
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
      ConnectivityCommand,
      DemoteCommand,
      InviteCommand,
      KickCommand,
      ListCommand,
      LogCommand,
      MuteCommand,
      OverrideCommand,
      PingCommand,
      PromoteCommand,
      ReconnectCommand,
      SetrankCommand,
      RestartCommand,
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
      const channelType = this.getChannelType(interaction.channelId)
      if (command == undefined) {
        this.clientInstance.logger.debug(`command but it doesn't exist: ${interaction.commandName}`)

        await interaction.reply({
          content: 'Command is not implemented somehow. Maybe there is new version?',
          ephemeral: true
        })
        return
      } else if (!channelType) {
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
          instanceType: InstanceType.DISCORD,
          channelType: channelType,
          discordChannelId: interaction.channelId,
          username,
          fullCommand: interaction.command?.options.toString() ?? '',
          commandName: interaction.commandName,
          // discord commands response are long
          // and not useful for others across platform to read
          commandResponse: `[${interaction.user.username}] /${interaction.commandName}`,
          alreadyReplied: true
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

    for (const [, guild] of this.clientInstance.client.guilds.cache) {
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
    if (roles.cache.some((role) => this.clientInstance.config.helperRoleIds.includes(role.id))) {
      highestPerm = Permission.HELPER
    }
    if (roles.cache.some((role) => this.clientInstance.config.officerRoleIds.includes(role.id))) {
      highestPerm = Permission.OFFICER
    }

    return highestPerm >= permissionLevel
  }

  private getChannelType(channelId: string): ChannelType | undefined {
    if (this.clientInstance.config.publicChannelIds.includes(channelId)) return ChannelType.PUBLIC
    if (this.clientInstance.config.officerChannelIds.includes(channelId)) return ChannelType.OFFICER
    return undefined
  }

  private getCommandsJson(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    const commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    const instanceChoices = this.clientInstance.app.clusterHelper
      .getInstancesNames(InstanceType.MINECRAFT)
      .map((choice: string) => ({
        name: choice,
        value: choice
      }))

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
