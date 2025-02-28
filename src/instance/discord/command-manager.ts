import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  GuildMemberRoleManager,
  Interaction,
  RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js'
import { Collection, escapeMarkdown, REST, Routes } from 'discord.js'
import type { Logger } from 'log4js'

import type { DiscordConfig } from '../../application-config.js'
import type Application from '../../application.js'
import { ChannelType, Color, InstanceType } from '../../common/application-event.js'
import type { DiscordAutoCompleteContext, DiscordCommandContext, DiscordCommandHandler } from '../../common/commands.js'
import { OptionToAddMinecraftInstances, Permission } from '../../common/commands.js'
import EventHandler from '../../common/event-handler.js'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type EventHelper from '../../util/event-helper.js'

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
import { DefaultCommandFooter } from './common/discord-config.js'
import type DiscordInstance from './discord-instance.js'

export class CommandManager extends EventHandler<DiscordInstance, InstanceType.Discord> {
  readonly commands = new Collection<string, DiscordCommandHandler>()

  private readonly config

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<InstanceType.Discord>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler,
    config: DiscordConfig
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
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
      if (interaction.isChatInputCommand()) {
        void this.onCommand(interaction).catch(
          this.errorHandler.promiseCatch('handling incoming ChatInputCommand event')
        )
      } else if (interaction.isAutocomplete()) {
        void this.onAutoComplete(interaction).catch(
          this.errorHandler.promiseCatch('handling incoming autocomplete event')
        )
      }
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

  private async onAutoComplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName)
    if (!command) {
      this.logger.warn(`command ${interaction.commandName} not found for autocomplete interaction.`)
      return
    }

    if (command.autoComplete) {
      const context: DiscordAutoCompleteContext = {
        application: this.application,
        eventHelper: this.eventHelper,
        logger: this.logger,
        errorHandler: this.errorHandler,
        instanceName: this.clientInstance.instanceName,
        privilege: this.resolvePrivilegeLevel(interaction),
        interaction: interaction
      }

      try {
        await command.autoComplete(context)
      } catch (error: unknown) {
        this.logger.error(error)
      }
    }
  }

  private async onCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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
      } else if (!this.memberAllowed(interaction, command.permission)) {
        this.logger.debug('No permission to execute this command')

        await interaction.reply({
          content: "You don't have permission to execute this command",
          ephemeral: true
        })
        return
      } else if (
        (command.addMinecraftInstancesToOptions === OptionToAddMinecraftInstances.Required ||
          command.addMinecraftInstancesToOptions === OptionToAddMinecraftInstances.Optional) &&
        this.application.clusterHelper.getInstancesNames(InstanceType.Minecraft).length === 0
      ) {
        await interaction.editReply({
          embeds: [
            {
              title: `Command ${escapeMarkdown(command.getCommandBuilder().name)}`,
              description:
                `No Minecraft instance exist.\n` +
                'This is a Minecraft command that requires a working Minecraft account connected to the bridge.\n' +
                `Check the tutorial on how to add a Minecraft account before using this command.`,
              color: Color.Info,
              footer: {
                text: DefaultCommandFooter
              }
            }
          ]
        })
        return
      } else {
        this.logger.debug('execution granted.')

        const username = interaction.inCachedGuild() ? interaction.member.displayName : interaction.user.displayName

        this.application.emit('command', {
          ...this.eventHelper.fillBaseEvent(),

          channelType: channelType,
          discordChannelId: interaction.channelId,
          username,
          fullCommand: interaction.options.data.map((option) => `${option.name}:${option.value}`).join(' '),
          commandName: interaction.commandName,
          // discord commands response are long
          // and not useful for others across platform to read
          commandResponse: `[${interaction.user.username}] /${interaction.commandName}`,
          alreadyReplied: true
        })

        const commandContext: DiscordCommandContext = {
          application: this.application,
          eventHelper: this.eventHelper,
          logger: this.logger,
          errorHandler: this.errorHandler,
          instanceName: this.clientInstance.instanceName,
          privilege: this.resolvePrivilegeLevel(interaction),
          interaction: interaction,

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

  private memberAllowed(interaction: Interaction, permissionLevel: Permission): boolean {
    if (permissionLevel === Permission.Anyone) return true

    return this.resolvePrivilegeLevel(interaction) >= permissionLevel
  }

  private resolvePrivilegeLevel(interaction: Interaction): Permission {
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
      const instanceCommandName = 'instance'
      const instanceCommandDescription = 'Which instance to send this command to'
      if (instanceChoices.length > 0) {
        switch (command.addMinecraftInstancesToOptions) {
          case OptionToAddMinecraftInstances.Required: {
            commandBuilder.addStringOption((option) =>
              option
                .setName(instanceCommandName)
                .setDescription(instanceCommandDescription)
                .setChoices(...instanceChoices)
                .setRequired(true)
            )
            break
          }
          case OptionToAddMinecraftInstances.Optional: {
            commandBuilder.addStringOption((option) =>
              option
                .setName(instanceCommandName)
                .setDescription(instanceCommandDescription)
                .setChoices(...instanceChoices)
            )
          }
        }
      }

      commandsJson.push(commandBuilder.toJSON())
    }

    return commandsJson
  }
}
