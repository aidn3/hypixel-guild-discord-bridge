import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import type { Logger } from 'log4js'

import type Application from '../../../application'

export enum Permission {
  ANYONE = 'anyone',
  HELPER = 'helper',
  OFFICER = 'officer',
  ADMIN = 'admin'
}

export interface CommandInterface {
  getCommandBuilder: () => SlashCommandBuilder
  allowInstance: boolean
  permission: Permission
  handler: (context: DiscordCommandContext) => Promise<void>
}

export interface DiscordCommandContext {
  application: Application
  logger: Logger
  instanceName: string
  interaction: ChatInputCommandInteraction
  privilege: Permission
  showPermissionDenied: () => Promise<void>
}
