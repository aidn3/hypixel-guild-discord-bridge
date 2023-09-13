import fs = require('fs')
import {
  BaseInteraction,
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

export class CommandManager extends EventHandler<DiscordInstance> {
  private readonly commands = new Collection<string, DiscordCommandInterface>()

  constructor(discordInstance: DiscordInstance) {
    super(discordInstance)

    let timeoutId: null | NodeJS.Timeout = null
    const timerReset = (): void => {
      if (timeoutId != null) clearTimeout(timeoutId)
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
    const commandPath = './src/instance/discord/commands'
    fs.readdirSync(commandPath)
      .filter((file: string) => file.endsWith('Command.ts'))
      .forEach((file: string) => {
        const filePath = `./commands/${file}`
        this.clientInstance.logger.debug(`Loading command ${filePath}`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const command = require(filePath).default as DiscordCommandInterface

        this.commands.set(command.getCommandBuilder().name, command)
      })

    this.clientInstance.client.on('interactionCreate', async (interaction) => await this.interactionCreate(interaction))
    this.clientInstance.logger.debug('CommandManager is registered')
  }

  private interactionCreate(interaction: BaseInteraction): Promise<any> | undefined {
    if (!interaction.isCommand()) return

    this.clientInstance.logger.debug(`${interaction.user.tag} executing ${interaction.commandName}`)
    const command = this.commands.get(interaction.commandName)

    try {
      if (command == null) {
        this.clientInstance.logger.debug(`command but it doesn't exist: ${interaction.commandName}`)

        return interaction.reply({
          content: 'Command is not implemented somehow. Maybe there is new version?',
          ephemeral: true
        })
      } else if (!this.channelAllowed(interaction)) {
        this.clientInstance.logger.debug(`can't execute in channel ${interaction.channelId}`)

        return interaction.reply({
          content: 'You can only use commands in public/officer bridge channels!',
          ephemeral: true
        })
      } else if (!this.memberAllowed(interaction, command.permission)) {
        this.clientInstance.logger.debug('No permission to execute this command')

        return interaction.reply({
          content: "You don't have permission to execute this command",
          ephemeral: true
        })
      } else {
        this.clientInstance.logger.debug('execution granted.')

        this.clientInstance.app.emit('command', {
          localEvent: true,
          instanceName: this.clientInstance.instanceName,
          location: LOCATION.DISCORD,
          scope: SCOPE.PUBLIC,
          username: (interaction?.member as GuildMember)?.displayName ?? interaction.user.username,
          fullCommand: interaction.command?.options.toString() ?? '',
          commandName: interaction.commandName
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

  private registerDiscordCommand(): void {
    this.clientInstance.logger.debug('Registering commands')
    const token = this.clientInstance.client.token as string
    const clientId = this.clientInstance.client.application?.id as string
    const commandsJson = this.getCommandsJson()

    this.clientInstance.client.guilds.cache.forEach((guild) => {
      this.clientInstance.logger.debug(`Informing guild ${guild.id} about commands`)
      const rest = new REST().setToken(token)
      void rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commandsJson })
    })
  }

  private memberAllowed(interaction: CommandInteraction, permissionLevel: number): boolean {
    if (permissionLevel === Permission.ANYONE || interaction.user.id === this.clientInstance.config.adminId) return true

    const roles = interaction.member?.roles as GuildMemberRoleManager | undefined
    if (roles == null) return false

    let highestPerm = Permission.ANYONE
    if (roles.cache.some((role) => this.clientInstance.config?.helperRoleIds?.some((id) => role.id === id)))
      highestPerm = Permission.HELPER
    if (roles.cache.some((role) => this.clientInstance.config.officerRoleIds.some((id) => role.id === id)))
      highestPerm = Permission.OFFICER

    return highestPerm >= permissionLevel
  }

  private channelAllowed(interaction: CommandInteraction): boolean {
    return (
      this.clientInstance.config.publicChannelIds.some((id) => interaction.channelId === id) ||
      this.clientInstance.config.officerChannelIds.some((id) => interaction.channelId === id)
    )
  }

  private getCommandsJson(): any {
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
