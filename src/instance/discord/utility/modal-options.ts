import assert from 'node:assert'

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  ModalComponentData,
  ModalSubmitInteraction
} from 'discord.js'
import { ChannelType, ComponentType, escapeMarkdown, SelectMenuDefaultValueType, TextInputStyle } from 'discord.js'

import type Duration from '../../../utility/duration'
import { parseNumberWithSuffice } from '../../../utility/shared-utility'

import type {
  BooleanOption,
  DiscordGuildOption,
  DiscordSelectOption,
  NumberOption,
  PresetListOption,
  TextOption
} from './options-handler'
import { InputStyle, OptionType } from './options-handler'

export type BaseModalOption =
  | (Omit<TextOption, 'getOption' | 'setOption'> & {
      defaultValue?: ReturnType<TextOption['getOption']>
      validate?: (value: string) => string | undefined
    })
  | (Omit<NumberOption, 'getOption' | 'setOption'> & {
      defaultValue?: ReturnType<NumberOption['getOption']>
      validate?: (value: number) => string | undefined
    })
  | (Omit<BooleanOption, 'getOption' | 'toggleOption'> & { defaultValue?: ReturnType<BooleanOption['getOption']> })
  | (Omit<PresetListOption, 'getOption' | 'setOption'> & { defaultValue?: ReturnType<PresetListOption['getOption']> })
  | (Omit<DiscordSelectOption, 'getOption' | 'setOption'> & {
      defaultValue?: ReturnType<DiscordSelectOption['getOption']>
    })
  | (Omit<DiscordGuildOption, 'getOption' | 'setOption'> & {
      defaultValue?: ReturnType<DiscordGuildOption['getOption']>
    })

export type ModalOption = BaseModalOption & {
  key: string
  formatter?: (value?: ModalResultType) => ModalResultType
}
export type ModalResultType = string | number | boolean | string[]
export type ModalResult = Record<string, ModalResultType>

export async function showModal(
  interaction: ButtonInteraction | ChatInputCommandInteraction,
  title: string,
  options: ModalOption[],
  timeout: Duration
): Promise<{
  result: ModalResult
  modalResponse: ModalSubmitInteraction | ButtonInteraction | ChatInputCommandInteraction
}> {
  assert.ok(options.length > 0, 'Must at least 1 option defined')
  ensureUniqueness(options)

  const result: ModalResult = {}
  const { components, values } = createComponents(interaction, options)
  Object.assign(result, values)

  let modalInteraction: ModalSubmitInteraction | ButtonInteraction | ChatInputCommandInteraction = interaction
  if (components.length > 0) {
    const modalData: ModalComponentData = { title, components, customId: interaction.id }
    await interaction.showModal(modalData)

    const modalResponse = await interaction.awaitModalSubmit({
      time: timeout.toMilliseconds(),
      filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
    })
    const modalResult = parseResponse(options, modalResponse)
    Object.assign(result, modalResult)
    modalInteraction = modalResponse
  }

  return { result: result, modalResponse: modalInteraction }
}

function ensureUniqueness(options: ModalOption[]): void {
  const keys = new Set<string>()
  for (const option of options) {
    const key = option.key
    assert.ok(!keys.has(key), `Key ${key} already defined`)
    keys.add(key)
  }
}

function createComponents(
  interaction: Interaction,
  options: ModalOption[]
): {
  components: ModalComponentData['components']
  values: ModalResult
} {
  const components: Writeable<ModalComponentData['components']> = []
  const values: ModalResult = {}

  for (const option of options) {
    switch (option.type) {
      case OptionType.Boolean: {
        const selectOptions = [
          { label: 'Yes', value: 'true' },
          { label: 'No', value: 'false' }
        ]

        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          component: {
            type: ComponentType.StringSelect,
            customId: option.key,
            minValues: 1,
            maxValues: 1,
            required: true,
            options: selectOptions
          }
        })
        break
      }
      case OptionType.Text: {
        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          // @ts-expect-error Discord API does not allow "label" repeated. "label" inside the component{} is removed
          component: {
            type: ComponentType.TextInput,
            style: option.style === InputStyle.Long ? TextInputStyle.Paragraph : TextInputStyle.Short,
            customId: option.key,
            minLength: option.min,
            maxLength: option.max,
            required: true,
            placeholder: option.placeholder,
            value: option.defaultValue?.toString()
          }
        })
        break
      }
      case OptionType.PresetList: {
        const selectOptions = option.options.map((opt) => ({
          label: opt.label,
          value: opt.value,
          description: opt.description,
          default: option.defaultValue?.includes(opt.value) ?? false
        }))

        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          component: {
            type: ComponentType.StringSelect,
            customId: option.key,
            minValues: option.min,
            maxValues: Math.min(option.options.length, option.max),
            required: true,
            options: selectOptions
          }
        })
        break
      }
      case OptionType.Number: {
        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          // @ts-expect-error Discord API does not allow "label" repeated. "label" inside the component{} is removed
          component: {
            type: ComponentType.TextInput,
            style: TextInputStyle.Short,
            customId: option.key,
            minLength: 1,
            required: true,
            value: option.defaultValue?.toString(10)
          }
        })
        break
      }
      case OptionType.Channel: {
        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          component: {
            type: ComponentType.ChannelSelect,
            customId: option.key,
            minValues: option.min,
            maxValues: option.max,
            channelTypes: [ChannelType.GuildText],
            required: true,
            defaultValues:
              option.defaultValue === undefined
                ? undefined
                : option.defaultValue.map((o) => ({ id: o, type: SelectMenuDefaultValueType.Channel }))
          }
        })

        break
      }
      case OptionType.Role: {
        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          component: {
            type: ComponentType.RoleSelect,
            customId: option.key,
            minValues: option.min,
            maxValues: option.max,
            required: true,
            defaultValues:
              option.defaultValue === undefined
                ? undefined
                : option.defaultValue.map((o) => ({ id: o, type: SelectMenuDefaultValueType.Role }))
          }
        })
        break
      }
      case OptionType.User: {
        components.push({
          type: ComponentType.Label,
          label: option.name,
          description: option.description,
          component: {
            type: ComponentType.UserSelect,
            customId: option.key,
            minValues: option.min,
            maxValues: option.max,
            required: true,
            defaultValues:
              option.defaultValue === undefined
                ? undefined
                : option.defaultValue.map((o) => ({ id: o, type: SelectMenuDefaultValueType.User }))
          }
        })
        break
      }
      case OptionType.DiscordGuild: {
        const rawValue = interaction.guildId ?? undefined
        if (rawValue === undefined) throw new Error('This interaction can only be done inside a Discord server!')
        values[option.key] = rawValue
        break
      }
      default: {
        option satisfies never
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        assert.fail(`unknown option ${option}`)
      }
    }
  }

  return { components, values }
}

function parseResponse(options: ModalOption[], modalResponse: ModalSubmitInteraction): ModalResult {
  const result: ModalResult = {}

  for (const option of options) {
    let value: ModalResultType
    switch (option.type) {
      case OptionType.Boolean: {
        value = modalResponse.fields.getStringSelectValues(option.key)[0] === 'true'
        break
      }
      case OptionType.Text: {
        value = modalResponse.fields.getTextInputValue(option.key)
        if (option.validate != undefined) {
          const response = option.validate(value)
          if (response !== undefined) throw new Error(response)
        }
        break
      }
      case OptionType.PresetList: {
        value = modalResponse.fields.getStringSelectValues(option.key).map((o) => o)
        break
      }
      case OptionType.Number: {
        const rawValue = modalResponse.fields.getTextInputValue(option.key)
        let intValue: number
        try {
          intValue = parseNumberWithSuffice(rawValue)
          if (intValue < option.min || intValue > option.max) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error('dummy') // dummy caught locally
          }
        } catch {
          throw new Error(
            `**${option.name}** must be a number between ${option.min} and ${option.max}.\nGiven: ${escapeMarkdown(rawValue)}`
          )
        }

        if (option.validate != undefined) {
          const response = option.validate(intValue)
          if (response !== undefined) throw new Error(response)
        }
        value = intValue
        break
      }
      case OptionType.Channel: {
        value = modalResponse.fields.getSelectedChannels(option.key, true).map((o) => o.id)
        break
      }
      case OptionType.Role: {
        value = modalResponse.fields
          .getSelectedRoles(option.key, true)
          .map((o) => o?.id)
          .filter((o) => o !== undefined)
        break
      }
      case OptionType.User: {
        value = modalResponse.fields.getSelectedUsers(option.key, true).map((o) => o.id)
        break
      }
      case OptionType.DiscordGuild: {
        assert.fail(`this option can not be processed via a modal: ${option.key}`)
        break
      }
      default: {
        option satisfies never
        throw new Error(`Unknown option: ${JSON.stringify(option)}`)
      }
    }

    result[option.key] = option.formatter === undefined ? value : option.formatter(value)
  }

  return result
}
