import assert from 'node:assert'

import { SlashCommandBuilder } from 'discord.js'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import { DefaultTimeout, interactivePaging } from '../utility/discord-pager.js'

import { Messages30Days, Online30Days, Points30Days } from './create-leaderboard.js'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('display a leaderboard message in this channel')
      .addStringOption((o) =>
        o
          .setName('type')
          .setDescription('Leaderboard type')
          .setRequired(true)
          .addChoices(Messages30Days, Online30Days, Points30Days)
      )
      .addStringOption((o) => o.setName('guild-name').setDescription('Hypixel Guild name')),

  handler: async function (context) {
    assert.ok(context.interaction.inGuild())
    const channel = context.interaction.channel
    assert.ok(channel)
    assert.ok(channel.isSendable(), 'not text based channel?')
    await context.interaction.deferReply()

    const type = context.interaction.options.getString('type', true)
    const guildName = context.interaction.options.getString('guild-name') ?? undefined
    let guildId: string | undefined
    if (guildName !== undefined) {
      guildId = await context.application.hypixelApi.getGuildByName(guildName).then((guild) => guild?._id)
      if (guildId === undefined) {
        await context.interaction.editReply('No such guild.')
        return
      }
    }

    if (type === Messages30Days.value) {
      await interactivePaging(context.interaction, 0, DefaultTimeout, context.errorHandler, async (requestedPage) => {
        return await context.application.discordInstance.leaderboard.getMessage30Days({
          addFooter: true,
          addLastUpdateAt: false,
          page: requestedPage,
          guildId: guildId,
          user: context.user
        })
      })
      return
    }

    if (type === Online30Days.value) {
      await interactivePaging(context.interaction, 0, DefaultTimeout, context.errorHandler, async (requestedPage) => {
        return await context.application.discordInstance.leaderboard.getOnline30Days({
          addFooter: true,
          addLastUpdateAt: false,
          page: requestedPage,
          guildId: guildId,
          user: context.user
        })
      })
      return
    }

    if (type === Points30Days.value) {
      await interactivePaging(context.interaction, 0, DefaultTimeout, context.errorHandler, async (requestedPage) => {
        return await context.application.discordInstance.leaderboard.getPoints30Days({
          addFooter: true,
          addLastUpdateAt: false,
          page: requestedPage,
          guildId: guildId,
          user: context.user
        })
      })
      return
    }
  }
} satisfies DiscordCommandHandler
