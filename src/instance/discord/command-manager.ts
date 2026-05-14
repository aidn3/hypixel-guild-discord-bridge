import assert from 'node:assert'

import { ComponentType, InteractionContextType, PermissionFlagsBits } from 'discord-api-types/v10'
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord.js'
import { Collection, escapeMarkdown, MessageFlags, REST, Routes } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../application.js'
import { Color, Permission } from '../../common/application-event.js'
import type {
  DiscordBridgeCommandHandler,
  DiscordCommandContext,
  DiscordCommandHandler,
  DiscordGuildCommandHandler,
  DiscordPrivateCommandHandler
} from '../../common/commands.js'
import { CommandOrigin, OptionMinecraftInstance } from '../../common/commands.js'
import type EventHelper from '../../common/event-helper.js'
import SubInstance from '../../common/sub-instance'
import type UnexpectedErrorHandler from '../../common/unexpected-error-handler.js'
import type { User } from '../../common/user'
import Duration from '../../utility/duration'
import { beautifyInstanceName } from '../../utility/shared-utility'
// eslint-disable-next-line import/no-restricted-paths
import type MinecraftInstance from '../minecraft/minecraft-instance'

import AboutCommand from './commands/about.js'
import AcceptCommand from './commands/accept.js'
import AdminCommand from './commands/admin.js'
import RolesCommand from './commands/conditions'
import ConnectivityCommand from './commands/connectivity.js'
import CreateLeaderboardCommand from './commands/create-leaderboard.js'
import DemoteCommand from './commands/demote.js'
import DisconnectCommand from './commands/disconnect.js'
import ExecuteCommand from './commands/execute.js'
import FaqCommand from './commands/faq'
import HelpCommand from './commands/help.js'
import InviteCommand from './commands/invite.js'
import JoinCommand from './commands/join.js'
import LeaderboardCommand from './commands/leaderboard.js'
import LinkButton from './commands/link-button'
import LinkCommand from './commands/link.js'
import ListLeaderboardCommand from './commands/list-leaderboard'
import ListCommand from './commands/list.js'
import LogCommand from './commands/log.js'
import MotdCommand from './commands/motd'
import PingCommand from './commands/ping.js'
import PlaceholderCommand from './commands/placeholder.js'
import ProfanityCommand from './commands/profanity.js'
import PromoteCommand from './commands/promote.js'
import PunishmentsCommand from './commands/punishments.js'
import ReconnectCommand from './commands/reconnect.js'
import RestartCommand from './commands/restart.js'
import SetrankCommand from './commands/setrank.js'
import SettingsCommand from './commands/settings.js'
import SyncCommand from './commands/sync'
import SyncallCommand from './commands/syncall'
import UnlinkCommand from './commands/unlink.js'
import VerificationCommand from './commands/verification.js'
import { DefaultCommandFooter } from './common/discord-config.js'
import { translateNoPermission } from './common/discord-language'
import type DiscordInstance from './discord-instance.js'

export class CommandManager extends SubInstance<DiscordInstance, Client> {
  readonly commands = new Collection<string, DiscordCommandHandler>()

  constructor(
    application: Application,
    clientInstance: DiscordInstance,
    eventHelper: EventHelper<DiscordInstance>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)
    this.addDefaultCommands()
  }

  override registerEvents(client: Client): void {
    client.once('clientReady', (client) => {
      void this.registerDiscordCommand(client).catch(
        this.errorHandler.promiseCatch('registering and managing slash commands')
      )
    })

    client.on('interactionCreate', (interaction) => {
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

  private addDefaultCommands(): void {
    const toAdd: DiscordCommandHandler[] = [
      AboutCommand,
      AcceptCommand,
      AdminCommand,
      SettingsCommand,
      ConnectivityCommand,
      CreateLeaderboardCommand,
      DemoteCommand,
      DisconnectCommand,
      FaqCommand,
      HelpCommand,
      InviteCommand,
      JoinCommand,
      LeaderboardCommand,
      LinkCommand,
      LinkButton,
      ListCommand,
      ListLeaderboardCommand,
      LogCommand,
      MotdCommand,
      ExecuteCommand,
      PingCommand,
      PlaceholderCommand,
      ProfanityCommand,
      PromoteCommand,
      PunishmentsCommand,
      ReconnectCommand,
      RolesCommand,
      SetrankCommand,
      SyncCommand,
      SyncallCommand,
      RestartCommand,
      UnlinkCommand,
      VerificationCommand
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
    } else if (!command.autoComplete) {
      return
    }

    const identifier = this.clientInstance.profileByUser(interaction.user, interaction.member ?? undefined)
    const user = await this.application.core.initializeDiscordUser(identifier)

    switch (command.origin) {
      case CommandOrigin.Bridge:
      case CommandOrigin.Guild: {
        if (!interaction.inGuild()) {
          this.logger.warn('A guild-bound command was executed outside a guild somehow??')
          return
        }

        const context = this.fillContext(interaction, user, await user.permission())
        await command.autoComplete(context)
        break
      }
      case CommandOrigin.Private: {
        const context = this.fillContext(interaction, user, await user.permission())
        await command.autoComplete(context)
        break
      }
      default: {
        command satisfies never
      }
    }
  }

  /*
   * - allow when channel registered and permitted
   * - allow if channel not registered but command requires admin and user is permitted
   * - disallow if not permitted
   * - disallow if not in proper channel
   */
  private async onCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    this.logger.debug(`${interaction.user.tag} executing ${interaction.commandName}`)
    const command = this.commands.get(interaction.commandName)

    try {
      if (command == undefined) {
        this.logger.debug(`command but it doesn't exist: ${interaction.commandName}`)

        await interaction.reply({
          content: 'Command is not implemented somehow. Maybe there is new a version?',
          flags: MessageFlags.Ephemeral
        })
        return
      }

      switch (command.origin) {
        case CommandOrigin.Private: {
          await this.handlePrivateCommand(interaction, command)
          break
        }
        case CommandOrigin.Guild: {
          if (!interaction.inGuild()) {
            this.logger.warn('A guild-bound command was executed outside a guild somehow??')
            await interaction.reply('Not allowed in this channel.')
            return
          }
          await this.handleGuildCommand(interaction, command)
          break
        }
        case CommandOrigin.Bridge: {
          if (!interaction.inGuild()) {
            this.logger.warn('A bridge-bound command was executed outside a bridge somehow??')
            await interaction.reply('Not allowed in this channel.')
            return
          }
          await this.handleBridgeCommand(interaction, command)
          break
        }
        default: {
          command satisfies never
        }
      }
      return
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
          flags: MessageFlags.Ephemeral
        })
        return
      }
    }
  }

  private async handlePrivateCommand(
    interaction: ChatInputCommandInteraction,
    command: DiscordPrivateCommandHandler
  ): Promise<void> {
    const identifier = this.clientInstance.profileByUser(interaction.user, undefined)
    const user = await this.application.core.initializeDiscordUser(identifier)

    const permission = await user.permission()
    if (permission < command.permission) {
      this.logger.debug('No permission to execute this command')
      assert.ok(command.permission !== Permission.Anyone)
      await interaction.reply({
        content: translateNoPermission(this.application, command.permission),
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      })
      return
    }

    const baseContext = this.fillContext(interaction, user, permission)
    const context: DiscordCommandContext<CommandOrigin.Private> = { ...baseContext, minecraftInstance: undefined }

    await command.handler(context)
  }

  private async handleGuildCommand(
    interaction: ChatInputCommandInteraction<'raw' | 'cached'>,
    command: DiscordGuildCommandHandler
  ): Promise<void> {
    const identifier = this.clientInstance.profileByUser(interaction.user, interaction.member)
    const user = await this.application.core.initializeDiscordUser(identifier)

    const baseContext = this.fillContext(interaction, user, await user.permission())
    const context: DiscordCommandContext<CommandOrigin.Guild> = { ...baseContext, minecraftInstance: undefined }

    await command.handler(context)
  }

  private async handleBridgeCommand(
    interaction: ChatInputCommandInteraction<'raw' | 'cached'>,
    command: DiscordBridgeCommandHandler<OptionMinecraftInstance>
  ): Promise<void> {
    const identifier = this.clientInstance.profileByUser(interaction.user, interaction.member)
    const user = await this.application.core.initializeDiscordUser(identifier)

    const permission = await user.permission()
    if (permission < command.permission) {
      this.logger.debug('No permission to execute this command')
      assert.ok(command.permission !== Permission.Anyone)
      await interaction.reply({
        content: translateNoPermission(this.application, command.permission),
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] }
      })
      return
    }

    const instances = this.application.minecraftManager.getAllInstances()
    if (
      (command.addMinecraftInstancesToOptions === OptionMinecraftInstance.RequireOne ||
        command.addMinecraftInstancesToOptions === OptionMinecraftInstance.RequireAll) &&
      instances.length === 0
    ) {
      await interaction.reply({
        embeds: [
          {
            title: `Command ${escapeMarkdown(command.getCommandBuilder().name)}`,
            description:
              `No Minecraft instance exist.\n` +
              'This is a Minecraft command that requires a working Minecraft account connected to the bridge.\n' +
              `Check the tutorial on how to add a Minecraft account before using this command.`,
            color: Color.Info,
            footer: { text: DefaultCommandFooter }
          }
        ],
        flags: MessageFlags.Ephemeral
      })
      return
    }

    switch (command.addMinecraftInstancesToOptions) {
      case OptionMinecraftInstance.None: {
        const baseContext = this.fillContext(interaction, user, permission)
        const context: DiscordCommandContext<CommandOrigin.Bridge> = { ...baseContext, minecraftInstance: undefined }
        await command.handler(context)
        break
      }
      case OptionMinecraftInstance.RequireOne: {
        let modifiedInteraction: DiscordCommandContext<CommandOrigin.Bridge>['interaction'] = interaction
        let targetInstance: MinecraftInstance | undefined

        if (instances.length === 1) {
          targetInstance = instances[0]
        } else {
          await interaction.showModal({
            customId: interaction.id,
            title: `/${escapeMarkdown(interaction.commandName)}: Select Minecraft`,
            components: [
              {
                type: ComponentType.Label,
                label: 'Minecraft Instance',
                description: `Multiple Minecraft instances detected. Choose one for the command ${interaction.commandName} to use.`,
                component: {
                  type: ComponentType.RadioGroup,
                  options: instances.map((instance) => ({
                    label: beautifyInstanceName(instance.getDisplayName()),
                    value: instance.getConfigName()
                  })),
                  customId: 'instances',
                  required: true
                }
              }
            ]
          })

          const modalResult = await interaction.awaitModalSubmit({ time: Duration.minutes(15).toMilliseconds() })
          const instanceName = modalResult.fields.getRadioGroup('instance', true)
          targetInstance = instances.find((instance) => instance.getConfigName() === instanceName)
          assert.ok(targetInstance !== undefined)
          modifiedInteraction = Object.assign(modalResult, { options: interaction.options })
        }

        const baseContext = this.fillContext(interaction, user, permission)
        const context: DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.RequireOne> = {
          ...baseContext,
          minecraftInstance: targetInstance
        }
        context.interaction = modifiedInteraction

        await (command as DiscordBridgeCommandHandler<OptionMinecraftInstance.RequireOne>).handler(context)
        break
      }
      case OptionMinecraftInstance.RequireAll: {
        const baseContext = this.fillContext(interaction, user, permission)
        const context: DiscordCommandContext<CommandOrigin.Bridge, OptionMinecraftInstance.RequireAll> = {
          ...baseContext,
          minecraftInstance: instances
        }
        await (command as DiscordBridgeCommandHandler<OptionMinecraftInstance.RequireAll>).handler(context)
        break
      }
      default: {
        command.addMinecraftInstancesToOptions satisfies never
      }
    }
  }

  private fillContext<I extends ChatInputCommandInteraction | AutocompleteInteraction, U extends User>(
    interaction: I,
    user: U,
    userPermission: Permission
  ) {
    return {
      application: this.application,
      eventHelper: this.eventHelper,
      logger: this.logger,
      errorHandler: this.errorHandler,
      user: user,

      interaction: interaction,
      permission: userPermission,
      t: this.application.i18n.t,

      allCommands: [...this.commands.values()],

      showPermissionDenied: async (requiredPermission: Exclude<Permission, Permission.Anyone>) => {
        if (!interaction.isChatInputCommand()) return

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: translateNoPermission(this.application, requiredPermission),
            allowedMentions: { parse: [] }
          })
          return
        } else {
          await interaction.reply({
            content: translateNoPermission(this.application, requiredPermission),
            flags: MessageFlags.Ephemeral,
            allowedMentions: { parse: [] }
          })
          return
        }
      }
    }
  }

  private async registerDiscordCommand(client: Client<true>): Promise<void> {
    this.logger.debug('Registering commands')

    const token = client.token
    const clientId = client.application.id
    const commandsJson = this.getCommandsJson()

    const rest = new REST().setToken(token)
    await rest.put(Routes.applicationCommands(clientId), { body: commandsJson })

    // delete legacy commands
    if (!this.application.core.migrationConfigurations.getDeleteDiscordGuildCommands()) {
      let warned = false
      for (const [, guild] of client.guilds.cache) {
        if (!warned) {
          this.logger.info('Detected existing Discord guilds that might not have migrated to the Command newer system')
          warned = true
        }

        await guild.commands.set([])
        this.logger.debug(`Deleting Discord guild=${guild.id} commands`)
      }

      this.application.core.migrationConfigurations.setDeleteDiscordGuildCommands(true)
      this.logger.info('Finished Discord guild commands migration.')
    }
  }

  private getCommandsJson(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    const commandsJson: RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
    for (const command of this.commands.values()) {
      const commandBuilder = command.getCommandBuilder()

      switch (command.origin) {
        case CommandOrigin.Private: {
          commandBuilder.setContexts(
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel,
            InteractionContextType.Guild
          )
          break
        }
        case CommandOrigin.Guild:
        case CommandOrigin.Bridge: {
          commandBuilder.setContexts(InteractionContextType.Guild)
          if (
            commandBuilder.default_member_permissions === undefined &&
            command.origin === CommandOrigin.Guild &&
            command.onlyAdmins
          ) {
            commandBuilder.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
          }
          break
        }
      }
      commandsJson.push(commandBuilder.toJSON())
    }

    return commandsJson
  }
}
