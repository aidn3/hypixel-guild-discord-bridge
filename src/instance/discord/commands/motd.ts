import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

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
      if (motd.lines.type === 'empty') {
        await context.interaction.editReply('Nothing to display. Guild does not have MOTD.')
        return
      }
      const lines = [
        motd.lines.header.content,
        ...motd.lines.content.map((line) => line.clean.content),
        motd.lines.footer.content
      ]
      const raw = [
        motd.lines.header.raw,
        ...motd.lines.content.map((line) => line.withPrefix.raw),
        motd.lines.footer.raw
      ]

      const image = MinecraftRenderer.renderSupported() ? MinecraftRenderer.renderLore(undefined, raw) : undefined
      await context.interaction.editReply({
        content: lines.map((line) => `> ${line}`).join('\n'),
        files: image === undefined ? undefined : [new AttachmentBuilder(image).setName('motd.png')]
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
