import assert from 'node:assert'

import type { ModalSubmitInteraction } from 'discord.js'
import {
  escapeMarkdown,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder
} from 'discord.js'

import type Application from '../../../application'
import { Color, Permission } from '../../../common/application-event.js'
import type {
  DiscordAutoCompleteContext,
  DiscordCommandContext,
  DiscordCommandHandler
} from '../../../common/commands.js'
import type {
  ConditionHandler,
  ConditionId,
  ConditionOption,
  HandlerDisplayContext
} from '../../../core/conditions/common'
import { OnUnmet } from '../../../core/conditions/common'
import type { NicknameCondition, RoleCondition } from '../../../core/discord/user-conditions'
import Duration from '../../../utility/duration'
import { search } from '../../../utility/shared-utility'
import { DefaultCommandFooter } from '../common/discord-config'
import { interactivePaging } from '../utility/discord-pager'
import type { ModalOption, ModalResult } from '../utility/modal-options'
import { showModal } from '../utility/modal-options'
import { InputStyle, OptionType } from '../utility/options-handler'

const ListCommand = new SlashCommandSubcommandBuilder().setName('list').setDescription('List all created conditions')
const AddCommand = new SlashCommandSubcommandBuilder()
  .setName('add')
  .setDescription('Start a wizard to add a new condition')
  .addStringOption((o) =>
    o.setName('type').setDescription('What type of condition to start creating').setAutocomplete(true).setRequired(true)
  )
const RemoveCommand = new SlashCommandSubcommandBuilder()
  .setName('remove')
  .setDescription('Remove a condition')
  .addStringOption((o) =>
    o.setName('condition').setDescription('The condition to remove').setAutocomplete(true).setRequired(true)
  )

export default {
  getCommandBuilder: () => {
    return new SlashCommandBuilder()
      .setName('conditions')
      .setDescription('manage conditions')
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('roles')
          .setDescription('manage conditions that give and remove Discord roles')
          .addSubcommand(ListCommand)
          .addSubcommand(AddCommand)
          .addSubcommand(RemoveCommand)
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('nicknames')
          .setDescription('manage conditions that change users nicknames in a Discord server')
          .addSubcommand(ListCommand)
          .addSubcommand(AddCommand)
          .addSubcommand(RemoveCommand)
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

    const groupCommand = interaction.options.getSubcommandGroup(true)
    const subcommand = interaction.options.getSubcommand(true)
    const option = interaction.options.getFocused(true)
    const handlerContext = {
      application: context.application,
      startTime: Date.now() - Duration.minutes(15).toMilliseconds(), // Allowing caching if possible,
      discordGuild: interaction.guild
    } satisfies HandlerDisplayContext

    const allHandlers = context.application.core.conditonsRegistry.allHandlers()

    if (subcommand === 'add' && option.name === 'type') {
      const mapped = new Map<string, string>()
      for (const handler of allHandlers) {
        mapped.set(handler.getId(), handler.getDisplayName(handlerContext))
      }

      const searchResult = search(option.value, mapped.values().toArray()).slice(0, 25)
      const response = searchResult.map((entry) => ({ name: entry, value: mapped.get(entry) ?? entry }))
      await context.interaction.respond(response)
    } else if (subcommand === 'remove' && option.name === 'condition') {
      const conditions = getManager(groupCommand, interaction.guildId, context.application).conditions()
      const mapped = new Map<string, string>()
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

      const searchResult = search(option.value, mapped.values().toArray()).slice(0, 25)
      const response = searchResult.map((entry) => ({ name: entry, value: mapped.get(entry) ?? entry }))
      await context.interaction.respond(response)
    }
  }
} satisfies DiscordCommandHandler

function getManager(
  groupCommand: string,
  guildId: string,
  application: Application
): {
  conditions: () => ConditionId[]
  remove: (id: string) => boolean
  createOptions: { top: ModalOption[]; bottom: ModalOption[] }
  add: (handlerId: string, data: ModalResult, conditionData: ConditionOption) => ConditionId
  translationKey: 'roles' | 'nicknames'
} {
  switch (groupCommand) {
    case 'roles': {
      return {
        conditions: () => application.core.discordUserConditions.getAllConditions(guildId).roles,
        remove: (id) => application.core.discordUserConditions.deleteRoleCondition(guildId, id),
        createOptions: {
          top: [
            {
              type: OptionType.Role,
              key: 'roleId',
              name: application.i18n.t(($) => $['discord.conditions.add.role.name']),
              description: application.i18n.t(($) => $['discord.conditions.add.role.description']),
              max: 1,
              min: 1
            }
          ],
          bottom: [
            {
              type: OptionType.PresetList,
              key: 'onUnmet',
              name: application.i18n.t(($) => $['discord.conditions.add.unmet.label']),
              description: application.i18n.t(($) => $['discord.conditions.add.unmet.description']),
              options: [
                {
                  label: application.i18n.t(($) => $['discord.conditions.add.unmet.keep-label']),
                  value: OnUnmet.Keep,
                  description: application.i18n.t(($) => $['discord.conditions.add.unmet.keep-description'])
                },
                {
                  label: application.i18n.t(($) => $['discord.conditions.add.unmet.remove-label']),
                  value: OnUnmet.Remove,
                  description: application.i18n.t(($) => $['discord.conditions.add.unmet.remove-description'])
                }
              ],
              defaultValue: [OnUnmet.Keep],
              max: 1,
              min: 1
            }
          ]
        },
        add: (handlerId, data: ModalResult, conditionData) => {
          const condition: RoleCondition = {
            typeId: handlerId,
            roleId: (data.roleId as string[])[0],
            onUnmet: data.onUnmet as OnUnmet,
            options: conditionData
          }

          return application.core.discordUserConditions.addRoleCondition(guildId, condition)
        },
        translationKey: 'roles'
      }
    }
    case 'nicknames': {
      return {
        conditions: () => application.core.discordUserConditions.getAllConditions(guildId).nicknames,
        remove: (id) => application.core.discordUserConditions.deleteRoleCondition(guildId, id),
        createOptions: {
          top: [
            {
              type: OptionType.Text,
              key: 'nickname',
              name: application.i18n.t(($) => $['discord.conditions.add.nickname.name']),
              description: application.i18n.t(($) => $['discord.conditions.add.nickname.description']),
              placeholder: application.i18n.t(($) => $['discord.conditions.add.nickname.placeholder']),
              style: InputStyle.Short,
              max: 200,
              min: 1
            }
          ],
          bottom: []
        },
        add: (handlerId, data: ModalResult, conditionData) => {
          const condition: NicknameCondition = {
            typeId: handlerId,
            nickname: data.nickname as string,
            options: conditionData
          }

          return application.core.discordUserConditions.addNicknameCondition(guildId, condition)
        },
        translationKey: 'nicknames'
      }
    }
    default: {
      throw new Error(`unknown group command: ${groupCommand}`)
    }
  }
}

async function handleList(context: Readonly<DiscordCommandContext>): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inGuild())
  assert.ok(interaction.inCachedGuild())

  const manager = getManager(interaction.options.getSubcommandGroup(true), interaction.guildId, context.application)
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

async function handleAdd(context: Readonly<DiscordCommandContext>): Promise<void> {
  const interaction = context.interaction
  assert.ok(interaction.inGuild())
  assert.ok(interaction.inCachedGuild())

  const conditionQuery = interaction.options.getString('type', true)
  const manager = getManager(interaction.options.getSubcommandGroup(true), interaction.guildId, context.application)
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

async function handleRemove(context: Readonly<DiscordCommandContext>): Promise<void> {
  const interaction = context.interaction
  const conditionQuery = interaction.options.getString('condition', true)

  assert.ok(interaction.inGuild())
  assert.ok(interaction.inCachedGuild())

  await interaction.deferReply()

  const allHandlers = context.application.core.conditonsRegistry.allHandlers()
  const manager = getManager(interaction.options.getSubcommandGroup(true), interaction.guildId, context.application)
  const conditions = manager.conditions()

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
