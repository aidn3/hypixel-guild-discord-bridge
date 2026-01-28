import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalComponentData,
  ModalSubmitInteraction
} from 'discord.js'
import { ChannelType, ComponentType, escapeMarkdown, SelectMenuDefaultValueType, TextInputStyle } from 'discord.js'

import type Duration from '../../../utility/duration'

import type { BooleanOption, DiscordSelectOption, NumberOption, PresetListOption, TextOption } from './options-handler'
import { InputStyle, OptionType } from './options-handler'

export type BaseModalOption =
  | (Omit<TextOption, 'getOption' | 'setOption'> & { defaultValue?: ReturnType<TextOption['getOption']> })
  | (Omit<NumberOption, 'getOption' | 'setOption'> & { defaultValue?: ReturnType<NumberOption['getOption']> })
  | (Omit<BooleanOption, 'getOption' | 'toggleOption'> & { defaultValue?: ReturnType<BooleanOption['getOption']> })
  | (Omit<PresetListOption, 'getOption' | 'setOption'> & { defaultValue?: ReturnType<PresetListOption['getOption']> })
  | (Omit<DiscordSelectOption, 'getOption' | 'setOption'> & {
      defaultValue?: ReturnType<DiscordSelectOption['getOption']>
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
): Promise<{ result: ModalResult; modalResponse: ModalSubmitInteraction }> {
  const components = createComponents(options)
  const modalData: ModalComponentData = { title, components, customId: interaction.id }

  await interaction.showModal(modalData)

  const modalResponse = await interaction.awaitModalSubmit({
    time: timeout.toMilliseconds(),
    filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
  })

  return { result: parseResponse(options, modalResponse), modalResponse }
}

function createComponents(options: ModalOption[]): ModalComponentData['components'] {
  const components: Writeable<ModalComponentData['components']> = []

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
    }
  }

  return components
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
        break
      }
      case OptionType.PresetList: {
        value = modalResponse.fields.getStringSelectValues(option.key).map((o) => o)
        break
      }
      case OptionType.Number: {
        const rawValue = modalResponse.fields.getTextInputValue(option.key)
        const intValue = rawValue.includes('.') ? Number.parseFloat(rawValue) : Number.parseInt(rawValue, 10)
        if (intValue < option.min || intValue > option.max || rawValue !== intValue.toString(10)) {
          throw new Error(
            `**${option.name}** must be a number between ${option.min} and ${option.max}.\nGiven: ${escapeMarkdown(rawValue)}`
          )
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
      default: {
        option satisfies never
        throw new Error(`Unknown option: ${JSON.stringify(option)}`)
      }
    }

    result[option.key] = option.formatter === undefined ? value : option.formatter(value)
  }

  return result
}
