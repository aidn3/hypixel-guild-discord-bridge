import { AttachmentBuilder, blockQuote, SlashCommandBuilder } from 'discord.js'

import { Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { OptionToAddMinecraftInstances } from '../../../common/commands.js'
import { GuildManagerError } from '../../../core/users/guild-manager'
import MinecraftRenderer from '../../../utility/minecraft-renderer'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('motd').setDescription('Show a guild MOTD'),
  addMinecraftInstancesToOptions: OptionToAddMinecraftInstances.Required,

  permission: Permission.Helper,
  handler: async function (context) {
    await context.interaction.deferReply()

    const instance: string = context.interaction.options.getString('instance', true)
    try {
      const motd = await context.application.core.guildManager.motd(instance)
      if (motd.lines.length === 0) {
        await context.interaction.editReply('Nothing to display. Guild does not have MOTD.')
        return
      }
      const lines = motd.lines.map((line) => line.content)
      const raw = motd.lines.map((line) => line.raw)

      const image = MinecraftRenderer.renderSupported() ? MinecraftRenderer.renderLore(undefined, raw) : undefined
      await context.interaction.editReply({
        content: lines.map((line) => blockQuote(line)).join('\n'),
        files: image === undefined ? undefined : [new AttachmentBuilder(image)]
      })
    } catch (error: unknown) {
      if (error instanceof GuildManagerError) {
        await context.interaction.editReply(error.message)
        return
      }

      throw error
    }
  }
} satisfies DiscordCommandHandler
