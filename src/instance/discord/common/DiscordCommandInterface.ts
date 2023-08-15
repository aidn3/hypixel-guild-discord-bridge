import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import DiscordInstance from '../DiscordInstance'

export enum Permission {
  ANYONE,
  HELPER,
  OFFICER,
  ADMIN
}

export interface DiscordCommandInterface {
  getCommandBuilder: () => SlashCommandBuilder
  allowInstance: boolean
  permission: Permission
  handler: (discordInstance: DiscordInstance, interaction: CommandInteraction) => Promise<void>
}
