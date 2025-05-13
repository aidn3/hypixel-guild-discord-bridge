import assert from 'node:assert'

import {
  ActionRowBuilder,
  type APIEmbed,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder
} from 'discord.js'

import type { DiscordCommandContext } from '../../../../common/commands.js'
import type { DiscordConfig } from '../../common/discord-config.js'

export const LogChannel = 'log-channel'
export const PublicChannel = 'public-channel'
export const OfficerChannel = 'officer-channel'
export const HelperRoles = 'helper-roles'
export const OfficerRoles = 'officer-roles'

export async function handleDiscordInteraction(context: DiscordCommandContext): Promise<void> {
  switch (context.interaction.options.getSubcommand()) {
    case LogChannel: {
      await handleDiscordLogChannels(context)
      break
    }
    case PublicChannel: {
      await handleDiscordPublicChannels(context)
      break
    }
    case OfficerChannel: {
      await handleDiscordOfficerChannels(context)
      break
    }
    case HelperRoles: {
      await handleDiscordHelperRoles(context)
      break
    }
    case OfficerRoles: {
      await handleDiscordOfficerRoles(context)
      break
    }
  }
}

async function handleDiscordLogChannels(context: DiscordCommandContext): Promise<void> {
  const config = context.application.discordInstance.getConfig()

  const menu = new ChannelSelectMenuBuilder()
    .setCustomId(LogChannel)
    .setMinValues(0)
    .setMaxValues(5)
    .addChannelTypes(ChannelType.GuildText)
    .addDefaultChannels(config.data.loggerChannelIds)

  const reply = await context.interaction.reply({
    embeds: [
      {
        description: 'Select channels to forward __**APPLICATION LOGS**__ to.',
        ...generateDiscordSettings(config.data)
      }
    ], // @ts-expect-error not all members are needed by the discord api
    components: [new ActionRowBuilder().addComponents(menu)]
  })

  reply
    .createMessageComponentCollector({
      time: 120_000,
      filter: (interaction) => interaction.user.id === context.interaction.user.id
    })
    .on('collect', (interaction) => {
      if (interaction.customId !== LogChannel) return
      assert(interaction.isChannelSelectMenu())

      config.data.loggerChannelIds = interaction.values
      config.save()
      void interaction
        .update({ embeds: [generateDiscordSettings(config.data)] })
        .catch(context.errorHandler.promiseCatch('selecting log channels'))
    })
    .on('end', () => {
      void reply.edit({ components: [] }).catch(context.errorHandler.promiseCatch('removing action row'))
    })
}

async function handleDiscordPublicChannels(context: DiscordCommandContext): Promise<void> {
  const config = context.application.discordInstance.getConfig()

  const menu = new ChannelSelectMenuBuilder()
    .setCustomId(PublicChannel)
    .setMinValues(0)
    .setMaxValues(5)
    .addChannelTypes(ChannelType.GuildText)
    .addDefaultChannels(config.data.publicChannelIds)

  const reply = await context.interaction.reply({
    embeds: [
      {
        description: 'Select channels to forward __**PUBLIC CHAT**__ to.',
        ...generateDiscordSettings(config.data)
      }
    ],
    // @ts-expect-error not all members are needed by the discord api
    components: [new ActionRowBuilder().addComponents(menu)]
  })

  reply
    .createMessageComponentCollector({
      time: 120_000,
      filter: (interaction) => interaction.user.id === context.interaction.user.id
    })
    .on('collect', (interaction) => {
      if (interaction.customId !== PublicChannel) return
      assert(interaction.isChannelSelectMenu())

      config.data.publicChannelIds = interaction.values
      config.save()
      void interaction
        .update({ embeds: [generateDiscordSettings(config.data)] })
        .catch(context.errorHandler.promiseCatch('selecting public channels'))
    })
    .on('end', () => {
      void reply.edit({ components: [] }).catch(context.errorHandler.promiseCatch('removing action row'))
    })
}

async function handleDiscordOfficerChannels(context: DiscordCommandContext): Promise<void> {
  const config = context.application.discordInstance.getConfig()

  const menu = new ChannelSelectMenuBuilder()
    .setCustomId(OfficerChannel)
    .setMinValues(0)
    .setMaxValues(5)
    .addChannelTypes(ChannelType.GuildText)
    .addDefaultChannels(config.data.officerChannelIds)

  const reply = await context.interaction.reply({
    embeds: [
      {
        description: 'Select channels to forward __**OFFICER CHAT**__ to.',
        ...generateDiscordSettings(config.data)
      }
    ], // @ts-expect-error not all members are needed by the discord api
    components: [new ActionRowBuilder().addComponents(menu)]
  })

  reply
    .createMessageComponentCollector({
      time: 120_000,
      filter: (interaction) => interaction.user.id === context.interaction.user.id
    })
    .on('collect', (interaction) => {
      if (interaction.customId !== OfficerChannel) return
      assert(interaction.isChannelSelectMenu())

      config.data.officerChannelIds = interaction.values
      config.save()
      void interaction
        .update({ embeds: [generateDiscordSettings(config.data)] })
        .catch(context.errorHandler.promiseCatch('selecting officer channels'))
    })
    .on('end', () => {
      void reply.edit({ components: [] }).catch(context.errorHandler.promiseCatch('removing action row'))
    })
}

async function handleDiscordHelperRoles(context: DiscordCommandContext): Promise<void> {
  const config = context.application.discordInstance.getConfig()

  const menu = new RoleSelectMenuBuilder()
    .setCustomId(HelperRoles)
    .setMinValues(0)
    .setMaxValues(5)
    .addDefaultRoles(config.data.helperRoleIds)

  const reply = await context.interaction.reply({
    embeds: [
      {
        description: 'Select roles to give __**HELPER ROLE**__ permissions to within the application.',
        ...generateDiscordSettings(config.data)
      }
    ], // @ts-expect-error not all members are needed by the discord api
    components: [new ActionRowBuilder().addComponents(menu)]
  })

  reply
    .createMessageComponentCollector({
      time: 120_000,
      filter: (interaction) => interaction.user.id === context.interaction.user.id
    })
    .on('collect', (interaction) => {
      if (interaction.customId !== HelperRoles) return
      assert(interaction.isRoleSelectMenu())

      config.data.helperRoleIds = interaction.values
      config.save()
      void interaction
        .update({ embeds: [generateDiscordSettings(config.data)] })
        .catch(context.errorHandler.promiseCatch('selecting helper roles'))
    })
    .on('end', () => {
      void reply.edit({ components: [] }).catch(context.errorHandler.promiseCatch('removing action row'))
    })
}

async function handleDiscordOfficerRoles(context: DiscordCommandContext): Promise<void> {
  const config = context.application.discordInstance.getConfig()

  const menu = new RoleSelectMenuBuilder()
    .setCustomId(OfficerRoles)
    .setMinValues(0)
    .setMaxValues(5)
    .addDefaultRoles(config.data.officerRoleIds)

  const reply = await context.interaction.reply({
    embeds: [
      {
        description: 'Select roles to give __**OFFICER ROLE**__ permissions to within the application.',
        ...generateDiscordSettings(config.data)
      }
    ], // @ts-expect-error not all members are needed by the discord api
    components: [new ActionRowBuilder().addComponents(menu)]
  })

  reply
    .createMessageComponentCollector({
      time: 10_000,
      filter: (interaction) => interaction.user.id === context.interaction.user.id
    })
    .on('collect', (interaction) => {
      if (interaction.customId !== OfficerRoles) return
      assert(interaction.isRoleSelectMenu())

      config.data.officerRoleIds = interaction.values
      config.save()
      void interaction
        .update({ embeds: [generateDiscordSettings(config.data)] })
        .catch(context.errorHandler.promiseCatch('selecting officer roles'))
    })
    .on('end', () => {
      void reply.edit({ components: [] }).catch(context.errorHandler.promiseCatch('removing action row'))
    })
}

function generateDiscordSettings(config: DiscordConfig): APIEmbed {
  return {
    title: 'Discord Settings',
    fields: [
      {
        name: 'Public Channels',
        inline: true,
        value:
          config.publicChannelIds.length === 0 ? '(none)' : config.publicChannelIds.map((id) => `- <#${id}>`).join('\n')
      },
      {
        name: 'Officer Channels',
        inline: true,
        value:
          config.officerChannelIds.length === 0
            ? '(none)'
            : config.officerChannelIds.map((id) => `- <#${id}>`).join('\n')
      },
      {
        name: 'Log Channels',
        inline: true,
        value:
          config.loggerChannelIds.length === 0 ? '(none)' : config.loggerChannelIds.map((id) => `- <#${id}>`).join('\n')
      },
      {
        name: 'Helper Roles',
        inline: true,
        value: config.helperRoleIds.length === 0 ? '(none)' : config.helperRoleIds.map((id) => `- <@&${id}>`).join('\n')
      },
      {
        name: 'Officer Roles',
        inline: true,
        value:
          config.officerRoleIds.length === 0 ? '(none)' : config.officerRoleIds.map((id) => `- <@&${id}>`).join('\n')
      }
    ]
  }
}
