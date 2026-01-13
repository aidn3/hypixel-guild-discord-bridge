import assert from 'node:assert'

import type { ModalSubmitInteraction } from 'discord.js'
import { escapeMarkdown, MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js'

import { Color, Permission } from '../../../common/application-event.js'
import type {
  DiscordAutoCompleteContext,
  DiscordCommandContext,
  DiscordCommandHandler
} from '../../../common/commands.js'
import type { ConditionOption, RoleCondition, RoleConditionId } from '../../../core/discord/user-conditions'
import { OnUnmet } from '../../../core/discord/user-conditions'
import Duration from '../../../utility/duration'
import { search } from '../../../utility/shared-utility'
import { DefaultCommandFooter } from '../common/discord-config'
import type { ConditionHandler, HandlerContext } from '../conditions/common'
import { interactivePaging } from '../utility/discord-pager'
import type { ModalOption, ModalResult } from '../utility/modal-options'
import { showModal } from '../utility/modal-options'
import { OptionType } from '../utility/options-handler'

export default {
  getCommandBuilder: () => {
    return new SlashCommandBuilder()
      .setName('roles')
      .setDescription('Give roles based on conditions')
      .addSubcommand(
        new SlashCommandSubcommandBuilder().setName('list').setDescription('List and manage all created conditions')
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('add')
          .setDescription('Start a wizard to add a new condition')
          .addStringOption((o) =>
            o
              .setName('type')
              .setDescription('What type of condition to start creating')
              .setAutocomplete(true)
              .setRequired(true)
          )
      )
      .addSubcommand(
        new SlashCommandSubcommandBuilder()
          .setName('remove')
          .setDescription('Remove a condition')
          .addStringOption((o) =>
            o.setName('condition').setDescription('The condition to remove').setAutocomplete(true).setRequired(true)
          )
      )
  },

  permission: Permission.Officer,

  handler: async function (context: Readonly<DiscordCommandContext>) {
    const subCommand = context.interaction.options.getSubcommand(true)
    switch (subCommand) {
      case 'list': {
        await handleList(context)
        break
      }
      case 'add': {
        await handleAdd(context)
        break
      }
      case 'remove': {
        await handleRemove(context)
        break
      }
    }
  },
  autoComplete: async function (context: Readonly<DiscordAutoCompleteContext>) {
    const interaction = context.interaction
    if (!interaction.inCachedGuild()) return

    const subcommand = interaction.options.getSubcommand(true)
    const option = interaction.options.getFocused(true)
    const handlerContext = {
      application: context.application,
      startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible,
      guild: interaction.guild
    } satisfies HandlerContext

    if (subcommand === 'add' && option.name === 'type') {
      const allHandlers = context.application.discordInstance.conditionsManager.allHandlers()

      const mapped = new Map<string, string>()
      for (const handler of allHandlers) {
        mapped.set(handler.getId(), handler.getDisplayName(handlerContext))
      }

      const searchResult = search(option.value, mapped.values().toArray()).slice(0, 25)
      const response = searchResult.map((entry) => ({ name: entry, value: mapped.get(entry) ?? entry }))
      await context.interaction.respond(response)
    } else if (subcommand === 'remove' && option.name === 'condition') {
      const interaction = context.interaction
      if (!interaction.inGuild()) return

      const allHandlers = context.application.discordInstance.conditionsManager.allHandlers()
      const conditions = context.application.core.discordUserConditions.getAllConditions(interaction.guildId)

      const mapped = new Map<string, string>()
      for (const roleCondition of conditions.roles) {
        const handler = allHandlers.find((handler) => handler.getId() === roleCondition.typeId)

        let displayName = `${roleCondition.id}-${roleCondition.typeId}`
        if (handler !== undefined) {
          try {
            displayName = await handler.displayCondition(handlerContext, roleCondition.options)
          } catch (error: unknown) {
            context.logger.error(error)
          }
        }
        mapped.set(roleCondition.id, displayName)
      }

      const searchResult = search(option.value, mapped.values().toArray()).slice(0, 25)
      const response = searchResult.map((entry) => ({ name: entry, value: mapped.get(entry) ?? entry }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

async function handleList(context: Readonly<DiscordCommandContext>): Promise<void> {
  const interaction = context.interaction

  assert.ok(interaction.inGuild())
  assert.ok(interaction.inCachedGuild())

  await interaction.deferReply()

  const guildId = interaction.guildId
  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible
    guild: interaction.guild
  } satisfies HandlerContext

  await interactivePaging(interaction, 0, Duration.minutes(15).toMilliseconds(), context.errorHandler, async (page) => {
    const EntriesPerPage = 10
    const allHandlers = context.application.discordInstance.conditionsManager.allHandlers()
    const conditions = context.application.core.discordUserConditions.getAllConditions(guildId)
    const list = conditions.roles

    const entries = list.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
    const totalPages = Math.ceil(list.length / EntriesPerPage)

    const title = context.application.i18n.t(($) => $['discord.conditions.roles.list.title'], {
      currentPage: page + 1,
      totalPages: Math.max(totalPages, 1)
    })
    let result: string
    if (entries.length > 0) {
      result = ''
      for (const entry of entries) {
        const handler = allHandlers.find((handler) => handler.getId() === entry.typeId)

        if (handler !== undefined) {
          try {
            const displayName = await handler.displayCondition(handlerContext, entry.options)
            result += context.application.i18n.t(($) => $['discord.conditions.roles.list.entry'], {
              condition: entry,
              display: escapeMarkdown(displayName)
            })
            continue
          } catch (error: unknown) {
            context.logger.error(error)
          }
        }

        result += context.application.i18n.t(($) => $['discord.conditions.roles.list.entry-invalid'], {
          condition: entry
        })
      }
    } else {
      result = context.application.i18n.t(($) => $['discord.conditions.roles.list.empty'])
    }

    return {
      totalPages: totalPages,
      embed: {
        title: title,
        description: result,
        footer: { text: DefaultCommandFooter }
      }
    }
  })
}

async function handleAdd(context: Readonly<DiscordCommandContext>): Promise<void> {
  const interaction = context.interaction
  const conditionQuery = interaction.options.getString('type', true)

  assert.ok(interaction.inGuild())
  assert.ok(interaction.inCachedGuild())

  const allHandlers = context.application.discordInstance.conditionsManager.allHandlers()
  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible
    guild: interaction.guild
  } satisfies HandlerContext

  let handler: ConditionHandler<ConditionOption> | undefined
  handler = allHandlers.find((handler) => handler.getId() == conditionQuery)
  if (handler === undefined) {
    for (const potentialHandler of allHandlers) {
      const displayName = potentialHandler.getDisplayName(handlerContext)
      if (displayName.toLowerCase() === conditionQuery.toLowerCase()) {
        handler = potentialHandler
        break
      }
    }
  }

  if (handler === undefined) {
    await interaction.reply({
      embeds: [
        {
          description: context.application.i18n.t(($) => $['discord.conditions.roles.add.not-found'], {
            query: escapeMarkdown(conditionQuery)
          }),
          color: Color.Bad,
          footer: { text: DefaultCommandFooter }
        }
      ]
    })
    return
  }

  const IdPrefix = 'option-id-'
  const rawOptions = handler.createOptions()
  const modalOptions: ModalOption[] = []

  const mappedId = new Map<string, string>()
  let currentId = 0
  for (const option of rawOptions) {
    const customId = `${IdPrefix}${currentId++}`

    mappedId.set(option.key, customId)
    modalOptions.push({ ...option, key: customId })
  }

  modalOptions.unshift({
    type: OptionType.Role,
    key: 'roleId',
    name: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-role-label']),
    description: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-role-description']),
    max: 1,
    min: 1
  })
  modalOptions.push({
    type: OptionType.PresetList,
    key: 'onUnmet',
    name: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-unmet-label']),
    description: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-unmet-description']),
    options: [
      {
        label: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-unmet-keep-label']),
        value: OnUnmet.Keep,
        description: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-unmet-keep-description'])
      },
      {
        label: context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-unmet-remove-label']),
        value: OnUnmet.Remove,
        description: context.application.i18n.t(
          ($) => $['discord.conditions.roles.add.wizard-unmet-remove-description']
        )
      }
    ],
    defaultValue: [OnUnmet.Keep],
    max: 1,
    min: 1
  })

  let rawFetchedOptions: { result: ModalResult; modalResponse: ModalSubmitInteraction }
  try {
    const title = context.application.i18n.t(($) => $['discord.conditions.roles.add.wizard-title'])
    rawFetchedOptions = await showModal(interaction, title, modalOptions, Duration.minutes(15))
  } catch (error: unknown) {
    context.logger.error(error)
    const errorResponse = context.application.i18n.t(($) => $['discord.conditions.roles.add.modal-error'])
    await interaction.followUp({ content: errorResponse, components: [], flags: MessageFlags.Ephemeral })
    return
  }

  const onUnmet = rawFetchedOptions.result.onUnmet as OnUnmet
  const roleId = (rawFetchedOptions.result.roleId as string[])[0]

  const resolvedOptions = {} as ConditionOption
  for (const rawOption of rawOptions) {
    const translatedKey = mappedId.get(rawOption.key)
    assert.ok(translatedKey !== undefined)
    resolvedOptions[rawOption.key] = rawFetchedOptions.result[translatedKey]
  }

  await rawFetchedOptions.modalResponse.deferReply()
  const conditionData = await handler.createCondition(handlerContext, resolvedOptions, rawOptions)
  if (typeof conditionData === 'string') {
    const errorResponse = context.application.i18n.t(($) => $['discord.conditions.roles.add.condition-error'], {
      errorMessage: conditionData
    })
    await rawFetchedOptions.modalResponse.editReply({ content: errorResponse, allowedMentions: { parse: [] } })
    return
  }
  const condition: RoleCondition = {
    roleId: roleId,
    onUnmet: onUnmet,
    typeId: handler.getId(),
    options: conditionData
  }
  const savedCondition = context.application.core.discordUserConditions.addRoleCondition(interaction.guildId, condition)

  const conditionDisplay = await handler.displayCondition(handlerContext, conditionData)
  const successMessage = context.application.i18n.t(($) => $['discord.conditions.roles.add.success'], {
    condition: savedCondition,
    conditionDisplay: conditionDisplay
  })
  await rawFetchedOptions.modalResponse.editReply({ content: successMessage, allowedMentions: { parse: [] } })
}

async function handleRemove(context: Readonly<DiscordCommandContext>): Promise<void> {
  const interaction = context.interaction
  const conditionQuery = interaction.options.getString('condition', true)

  assert.ok(interaction.inGuild())
  assert.ok(interaction.inCachedGuild())

  await interaction.deferReply()

  const guildId = interaction.guildId
  const allHandlers = context.application.discordInstance.conditionsManager.allHandlers()
  const conditions = context.application.core.discordUserConditions.getAllConditions(guildId)

  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible
    guild: interaction.guild
  } satisfies HandlerContext

  let conditionToDelete: RoleConditionId | undefined
  conditionToDelete = conditions.roles.find((condition) => condition.id == conditionQuery)
  if (conditionToDelete === undefined) {
    for (const roleCondition of conditions.roles) {
      const handler = allHandlers.find((handler) => handler.getId() === roleCondition.typeId)

      if (handler !== undefined) {
        try {
          const displayName = await handler.displayCondition(handlerContext, roleCondition.options)
          if (displayName.toLowerCase() === conditionQuery.toLowerCase()) {
            conditionToDelete = roleCondition
            break
          }
        } catch (error: unknown) {
          context.logger.error(error)
        }
      }
    }
  }

  if (conditionToDelete === undefined) {
    await interaction.editReply(context.application.i18n.t(($) => $['discord.conditions.roles.remove.not-found']))
    return
  }

  const deleted = context.application.core.discordUserConditions.deleteRoleCondition(guildId, conditionToDelete.id)
  if (deleted) {
    await interaction.editReply(context.application.i18n.t(($) => $['discord.conditions.roles.remove.success']))
    return
  } else {
    await interaction.editReply(context.application.i18n.t(($) => $['discord.conditions.roles.remove.fail']))
    return
  }
}
