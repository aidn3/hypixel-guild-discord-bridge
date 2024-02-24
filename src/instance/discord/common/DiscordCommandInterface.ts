import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import type DiscordInstance from '../DiscordInstance'

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
  handler: (discordInstance: DiscordInstance, interaction: ChatInputCommandInteraction) => Promise<void>
}
