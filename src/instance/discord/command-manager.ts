import type {
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
  GuildMemberRoleManager,
  Interaction,
  RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js'
import { Collection, GuildMember, REST, Routes } from 'discord.js'
import type { Logger } from 'log4js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { ChannelType, InstanceType } from '../../common/application-event.js'
import type { DiscordCommandContext, DiscordCommandHandler } from '../../common/commands.js'
import { Permission } from '../../common/commands.js'
import EventHandler from '../../common/event-handler.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'

import AboutCommand from './commands/about.js'
import AcceptCommand from './commands/accept.js'
import ConnectivityCommand from './commands/connectivity.js'
import DemoteCommand from './commands/demote.js'
import InviteCommand from './commands/invite.js'
import ListCommand from './commands/list.js'
import LogCommand from './commands/log.js'
import OverrideCommand from './commands/override.js'
import PingCommand from './commands/ping.js'
import PromoteCommand from './commands/promote.js'
import PunishmentsCommand from './commands/punishments.js'
import ReconnectCommand from './commands/reconnect.js'
import RestartCommand from './commands/restart.js'
import SetrankCommand from './commands/setrank.js'
import type DiscordInstance from './discord-instance.js'

export class CommandManager extends EventHandler<DiscordInstance> {
  readonly commands = new Collection<string, DiscordCommandHandler>()

  private readonly config

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    config: DiscordConfig
  ) {
    super(application, clientInstance, logger, errorHandler)
    this.config = config

    this.addDefaultCommands()
  }

  registerEvents(): void {
    let listenerStarted = false
    this.clientInstance.client.on('ready', (client) => {
      if (listenerStarted) return
      listenerStarted = true
      this.listenToRegisterCommands(client)
    })

    this.clientInstance.client.on('interactionCreate', (interaction) => {
      void this.interactionCreate(interaction).catch(
        this.errorHandler.promiseCatch('handling incoming discord interactionCreate event')
      )
    })
    this.logger.debug('CommandManager is registered')
  }

  private listenToRegisterCommands(client: Client<true>): void {
    const timeoutId = setTimeout(() => {
      this.registerDiscordCommand(client)
    }, 5 * 1000)

    this.application.on('minecraftSelfBroadcast', (): void => {
      timeoutId.refresh()
    })
    this.application.on('selfBroadcast', (event): void => {
      if (event.instanceType === InstanceType.Minecraft) {
        timeoutId.refresh()
      }
    })
  }

  private addDefaultCommands(): void {
    const toAdd = [
      AboutCommand,
      AcceptCommand,
      ConnectivityCommand,
      DemoteCommand,
      InviteCommand,
      ListCommand,
      LogCommand,
      OverrideCommand,
      PingCommand,
      PromoteCommand,
      PunishmentsCommand,
      ReconnectCommand,
      SetrankCommand,
      RestartCommand
    ]

    for (const command of toAdd) {
      this.commands.set(command.getCommandBuilder().name, command)
    }
  }

  private async interactionCreate(interaction: Interaction): Promise<void> {
    if (!interaction.isCommand()) return

    this.logger.debug(`${interaction.user.tag} executing ${interaction.commandName}`)
    const command = this.commands.get(interaction.commandName)

    try {
      const channelType = this.getChannelType(interaction.channelId)
      if (command == undefined) {
        this.logger.debug(`command but it doesn't exist: ${interaction.commandName}`)

        await interaction.reply({
          content: 'Command is not implemented somehow. Maybe there is new version?',
          ephemeral: true
        })
        return
      } else if (!channelType) {
        this.logger.debug(`can't execute in channel ${interaction.channelId}`)

        await interaction.reply({
          content: 'You can only use commands in public/officer bridge channels!',
          ephemeral: true
        })
        return
      } else if (this.memberAllowed(interaction, command.permission)) {
        this.logger.debug('execution granted.')

        const username =
          interaction.member instanceof GuildMember ? interaction.member.displayName : interaction.user.displayName

        this.application.emit('command', {
          localEvent: true,
          instanceName: this.clientInstance.instanceName,
          instanceType: InstanceType.Discord,
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

        const commandContext: DiscordCommandContext = {
          application: this.application,
          logger: this.logger,
          errorHandler: this.errorHandler,
          instanceName: this.clientInstance.instanceName,
          privilege: this.resolvePrivilegeLevel(interaction),
          interaction: interaction as ChatInputCommandInteraction,

          showPermissionDenied: async () => {
            if (interaction.deferred || interaction.replied) {
              await interaction.editReply({
                content: "You don't have permission to execute this command"
              })
              return
            } else {
              await interaction.reply({
                content: "You don't have permission to execute this command",
                ephemeral: true
              })
              return
            }
          }
        }

        await command.handler(commandContext)
        return
      } else {
        this.logger.debug('No permission to execute this command')

        await interaction.reply({
          content: "You don't have permission to execute this command",
          ephemeral: true
        })
        return
      }
    } catch (error) {
      this.logger.error(error)

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

  private registerDiscordCommand(client: Client<true>): void {
    this.logger.debug('Registering commands')

    const token = client.token
    const clientId = client.application.id
    const commandsJson = this.getCommandsJson()

    for (const [, guild] of client.guilds.cache) {
      this.logger.debug(`Informing guild ${guild.id} about commands`)
      const rest = new REST().setToken(token)
      void rest
        .put(Routes.applicationGuildCommands(clientId, guild.id), { body: commandsJson })
        .catch(this.errorHandler.promiseCatch('registering discord commands'))
    }
  }

  private memberAllowed(interaction: CommandInteraction, permissionLevel: Permission): boolean {
    if (permissionLevel === Permission.Anyone) return true

    return this.resolvePrivilegeLevel(interaction) >= permissionLevel
  }

  private resolvePrivilegeLevel(interaction: CommandInteraction): Permission {
    if (interaction.user.id === this.config.adminId) return Permission.Admin

    const roles = interaction.member?.roles as GuildMemberRoleManager | undefined
    if (roles == undefined) return Permission.Anyone

    if (roles.cache.some((role) => this.config.officerRoleIds.includes(role.id))) {
      return Permission.Officer
    }

    if (roles.cache.some((role) => this.config.helperRoleIds.includes(role.id))) {
      return Permission.Helper
    }

    return Permission.Anyone
  }

  private getChannelType(channelId: string): ChannelType | undefined {
    if (this.config.publicChannelIds.includes(channelId)) return ChannelType.Public
    if (this.config.officerChannelIds.includes(channelId)) return ChannelType.Officer
    return undefined
  }

  private getCommandsJson(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    const commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    const instanceChoices = this.application.clusterHelper
      .getInstancesNames(InstanceType.Minecraft)
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
