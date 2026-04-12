import assert from 'node:assert'

import type { ChatInputCommandInteraction } from 'discord.js'
import { SlashCommandBuilder, SlashCommandSubcommandGroupBuilder } from 'discord.js'

import type Application from '../../../application'
import { Permission } from '../../../common/application-event.js'
import type {
  DiscordAutoCompleteContext,
  DiscordCommandContext,
  DiscordCommandHandler
} from '../../../common/commands.js'
import { OnUnmet } from '../../../core/conditions/common'
import type { NicknameCondition, RoleCondition } from '../../../core/discord/user-conditions'
import type { CommandConditionHandler } from '../common/commands-conditions'
import {
  addConditionCommand,
  handleConditionAdd,
  handleConditionList,
  handleConditionRemove,
  handleSuggestConditionsAdd,
  handleSuggestConditionsRemove,
  listConditionCommand,
  removeConditionCommand
} from '../common/commands-conditions'
import type { ModalResult } from '../utility/modal-options'
import { InputStyle, OptionType } from '../utility/options-handler'

export default {
  getCommandBuilder: () => {
    return new SlashCommandBuilder()
      .setName('conditions')
      .setDescription('Manage conditions')
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('roles')
          .setDescription('Manage conditions that give and remove Discord roles')
          .addSubcommand(listConditionCommand())
          .addSubcommand(addConditionCommand())
          .addSubcommand(removeConditionCommand())
      )
      .addSubcommandGroup(
        new SlashCommandSubcommandGroupBuilder()
          .setName('nicknames')
          .setDescription('Manage conditions that change users nicknames in a Discord server')
          .addSubcommand(listConditionCommand())
          .addSubcommand(addConditionCommand())
          .addSubcommand(removeConditionCommand())
      )
  },

  permission: Permission.Officer,

  handler: async function (context: Readonly<DiscordCommandContext>) {
    const interaction = context.interaction
    const subCommand = interaction.options.getSubcommand(true)
    assert.ok(interaction.inGuild())
    assert.ok(interaction.inCachedGuild())

    switch (subCommand) {
      case 'list': {
        await handleList(interaction, context)
        break
      }
      case 'add': {
        await handleAdd(interaction, context)
        break
      }
      case 'remove': {
        await handleRemove(interaction, context)
        break
      }
    }
  },
  autoComplete: async function (context: Readonly<DiscordAutoCompleteContext>) {
    const interaction = context.interaction
    if (!interaction.inCachedGuild()) return

    const subcommand = interaction.options.getSubcommand(true)
    const option = interaction.options.getFocused(true)

    const allHandlers = context.application.core.conditonsRegistry.allHandlers()

    if (subcommand === 'add' && option.name === 'type') {
      await handleSuggestConditionsAdd(interaction, context, allHandlers)
    } else if (subcommand === 'remove' && option.name === 'condition') {
      const groupCommand = interaction.options.getSubcommandGroup(true)
      const manager = getManager(groupCommand, interaction.guildId, context.application)
      await handleSuggestConditionsRemove(interaction, context, allHandlers, manager)
    }
  }
} satisfies DiscordCommandHandler

function getManager(groupCommand: string, guildId: string, application: Application): CommandConditionHandler {
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

async function handleList(
  interaction: ChatInputCommandInteraction<'cached'>,
  context: Readonly<DiscordCommandContext>
) {
  const manager = getManager(interaction.options.getSubcommandGroup(true), interaction.guildId, context.application)
  await handleConditionList(interaction, context, manager)
}
async function handleAdd(interaction: ChatInputCommandInteraction<'cached'>, context: Readonly<DiscordCommandContext>) {
  const manager = getManager(interaction.options.getSubcommandGroup(true), interaction.guildId, context.application)
  await handleConditionAdd(interaction, context, manager)
}
async function handleRemove(
  interaction: ChatInputCommandInteraction<'cached'>,
  context: Readonly<DiscordCommandContext>
) {
  const manager = getManager(interaction.options.getSubcommandGroup(true), interaction.guildId, context.application)
  await handleConditionRemove(interaction, context, manager)
}
