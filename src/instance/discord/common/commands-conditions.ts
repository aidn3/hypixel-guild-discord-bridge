import assert from 'node:assert'

import type { AutocompleteInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js'
import { escapeMarkdown, MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js'

import { Color } from '../../../common/application-event.js'
import type { DiscordAutoCompleteContext, DiscordCommandContext } from '../../../common/commands'
import type {
  ConditionHandler,
  ConditionId,
  ConditionOption,
  HandlerDisplayContext
} from '../../../core/conditions/common'
import Duration from '../../../utility/duration'
import { search, searchObjects } from '../../../utility/shared-utility'
import { interactivePaging } from '../utility/discord-pager'
import type { ModalOption, ModalResult } from '../utility/modal-options'
import { showModal } from '../utility/modal-options'

import { DefaultCommandFooter } from './discord-config'

export interface CommandConditionHandler {
  conditions: () => ConditionId[]
  remove: (id: ConditionId['id']) => boolean
  createOptions: { top: ModalOption[]; bottom: ModalOption[] }
  add: (handlerId: string, data: ModalResult, conditionData: ConditionOption) => ConditionId
  translationKey: 'roles' | 'nicknames' | 'guild-join'
}

export function listConditionCommand(
  callback?: (command: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder
): SlashCommandSubcommandBuilder {
  const command = new SlashCommandSubcommandBuilder().setName('list').setDescription('List all created conditions')
  if (callback !== undefined) callback(command)

  return command
}

export function addConditionCommand(
  callback?: (command: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder
): SlashCommandSubcommandBuilder {
  const command = new SlashCommandSubcommandBuilder()
    .setName('add')
    .setDescription('Start a wizard to add a new condition')
  if (callback !== undefined) callback(command)

  command.addStringOption((o) =>
    o.setName('type').setDescription('What type of condition to start creating').setAutocomplete(true).setRequired(true)
  )
  return command
}
export function removeConditionCommand(
  callback?: (command: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder
): SlashCommandSubcommandBuilder {
  const command = new SlashCommandSubcommandBuilder().setName('remove').setDescription('Remove a condition')
  if (callback !== undefined) callback(command)

  command.addStringOption((o) =>
    o.setName('condition').setDescription('The condition to remove').setAutocomplete(true).setRequired(true)
  )
  return command
}

export async function handleConditionList(
  interaction: ChatInputCommandInteraction<'cached'>,
  context: Readonly<DiscordCommandContext>,
  manager: CommandConditionHandler
): Promise<void> {
  await interaction.deferReply()

  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible
    discordGuild: interaction.guild
  } satisfies HandlerDisplayContext

  await interactivePaging(interaction, 0, Duration.minutes(15).toMilliseconds(), context.errorHandler, async (page) => {
    const EntriesPerPage = 10
    const allHandlers = context.application.core.conditonsRegistry.allHandlers()
    const list = manager.conditions()

    const entries = list.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
    const totalPages = Math.ceil(list.length / EntriesPerPage)

    const title = context.application.i18n.t(($) => $['discord.conditions.list.title'][manager.translationKey], {
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
            result += context.application.i18n.t(($) => $['discord.conditions.list.entry'][manager.translationKey], {
              condition: entry,
              display: escapeMarkdown(displayName)
            })
            continue
          } catch (error: unknown) {
            context.logger.error(error)
          }
        }

        result += context.application.i18n.t(($) => $['discord.conditions.list.entry-invalid'], {
          condition: entry
        })
      }
    } else {
      result = context.application.i18n.t(($) => $['discord.conditions.list.empty'])
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

export async function handleConditionAdd(
  interaction: ChatInputCommandInteraction<'cached'>,
  context: Readonly<DiscordCommandContext>,
  manager: CommandConditionHandler
): Promise<void> {
  const conditionQuery = interaction.options.getString('type', true)
  const allHandlers = context.application.core.conditonsRegistry.allHandlers()
  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible
    discordGuild: interaction.guild
  } satisfies HandlerDisplayContext

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
          description: context.application.i18n.t(($) => $['discord.conditions.add.not-found'], {
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

  modalOptions.unshift(...manager.createOptions.top)
  modalOptions.push(...manager.createOptions.bottom)

  let rawFetchedOptions: { result: ModalResult; modalResponse: ModalSubmitInteraction }
  try {
    const title = context.application.i18n.t(($) => $['discord.conditions.add.title'][manager.translationKey])
    rawFetchedOptions = await showModal(interaction, title, modalOptions, Duration.minutes(15))
  } catch (error: unknown) {
    context.logger.error(error)
    const errorResponse = context.application.i18n.t(($) => $['discord.conditions.add.modal-error'])
    await interaction.followUp({ content: errorResponse, components: [], flags: MessageFlags.Ephemeral })
    return
  }

  const resolvedOptions = {} as ConditionOption
  for (const rawOption of rawOptions) {
    const translatedKey = mappedId.get(rawOption.key)
    assert.ok(translatedKey !== undefined)
    resolvedOptions[rawOption.key] = rawFetchedOptions.result[translatedKey]
  }

  await rawFetchedOptions.modalResponse.deferReply()
  const conditionData = await handler.createCondition(handlerContext, resolvedOptions, rawOptions)
  if (typeof conditionData === 'string') {
    const errorResponse = context.application.i18n.t(($) => $['discord.conditions.add.condition-error'], {
      errorMessage: conditionData
    })
    await rawFetchedOptions.modalResponse.editReply({ content: errorResponse, allowedMentions: { parse: [] } })
    return
  }

  const savedCondition = manager.add(handler.getId(), rawFetchedOptions.result, conditionData)
  const conditionDisplay = await handler.displayCondition(handlerContext, conditionData)
  const successMessage = context.application.i18n.t(
    ($) => $['discord.conditions.add.success'][manager.translationKey],
    {
      condition: savedCondition,
      conditionDisplay: conditionDisplay
    }
  )
  await rawFetchedOptions.modalResponse.editReply({ content: successMessage, allowedMentions: { parse: [] } })
}

export async function handleConditionRemove(
  interaction: ChatInputCommandInteraction<'cached'>,
  context: Readonly<DiscordCommandContext>,
  manager: CommandConditionHandler
): Promise<void> {
  const conditionQueryRaw = interaction.options.getString('condition', true)
  if (!/^\d+$/.test(conditionQueryRaw)) {
    return
  }
  const conditionQuery = Number.parseInt(conditionQueryRaw, 10)

  const allHandlers = context.application.core.conditonsRegistry.allHandlers()
  const conditions = manager.conditions()
  await interaction.deferReply()

  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible
    discordGuild: interaction.guild
  } satisfies HandlerDisplayContext

  let conditionToDelete: ConditionId | undefined
  conditionToDelete = conditions.find((condition) => condition.id == conditionQuery)
  if (conditionToDelete === undefined) {
    for (const roleCondition of conditions) {
      const handler = allHandlers.find((handler) => handler.getId() === roleCondition.typeId)

      if (handler !== undefined) {
        try {
          const displayName = await handler.displayCondition(handlerContext, roleCondition.options)
          if (displayName.toLowerCase().trim() === conditionQueryRaw.toLowerCase().trim()) {
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
    await interaction.editReply(context.application.i18n.t(($) => $['discord.conditions.remove.not-found']))
    return
  }

  const deleted = manager.remove(conditionToDelete.id)
  if (deleted) {
    await interaction.editReply(context.application.i18n.t(($) => $['discord.conditions.remove.success']))
    return
  } else {
    await interaction.editReply(context.application.i18n.t(($) => $['discord.conditions.remove.fail']))
    return
  }
}

export async function handleSuggestConditionsAdd(
  interaction: AutocompleteInteraction<'cached'>,
  context: Readonly<DiscordAutoCompleteContext>,
  allHandlers: ConditionHandler<ConditionOption>[]
): Promise<void> {
  const option = interaction.options.getFocused(true)
  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible,
    discordGuild: interaction.guild
  } satisfies HandlerDisplayContext

  const mapped = new Map<string, string>()
  for (const handler of allHandlers) {
    mapped.set(handler.getId(), handler.getDisplayName(handlerContext))
  }

  const searchResult = search(option.value, mapped.values().toArray()).slice(0, 25)
  const response = searchResult.map((entry) => ({ name: entry, value: mapped.get(entry) ?? entry }))
  await context.interaction.respond(response)
}

export async function handleSuggestConditionsRemove(
  interaction: AutocompleteInteraction<'cached'>,
  context: Readonly<DiscordAutoCompleteContext>,
  allHandlers: ConditionHandler<ConditionOption>[],
  manager: CommandConditionHandler
): Promise<void> {
  const option = interaction.options.getFocused(true)
  const conditions = manager.conditions()
  const handlerContext = {
    application: context.application,
    startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible,
    discordGuild: interaction.guild
  } satisfies HandlerDisplayContext

  const mapped = new Map<ConditionId['id'], string>()
  for (const condition of conditions) {
    const handler = allHandlers.find((handler) => handler.getId() === condition.typeId)

    let displayName = `${condition.id}-${condition.typeId}`
    if (handler !== undefined) {
      try {
        displayName = await handler.displayCondition(handlerContext, condition.options)
      } catch (error: unknown) {
        context.logger.error(error)
      }
    }
    mapped.set(condition.id, displayName)
  }

  const searchResult = searchObjects(option.value, mapped.entries().toArray(), ([, name]) => name).slice(0, 25)
  const response = searchResult.map(([id, name]) => ({ name: name, value: id.toString(10) }))
  await context.interaction.respond(response)
}
