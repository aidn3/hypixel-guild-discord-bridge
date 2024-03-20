import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

import type DiscordInstance from '../discord-instance'

export enum Permission {
  ANYONE,
  HELPER,
  OFFICER,
  ADMIN
}

export interface CommandInterface {
  getCommandBuilder: () => SlashCommandBuilder
  allowInstance: boolean
  permission: Permission
  handler: (discordInstance: DiscordInstance, interaction: ChatInputCommandInteraction) => Promise<void>
}
