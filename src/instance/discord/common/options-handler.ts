import assert from 'node:assert'

import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  CollectedInteraction,
  ComponentInContainerData,
  ContainerComponentData,
  InteractionResponse,
  ModalMessageModalSubmitInteraction,
  SectionComponentData
} from 'discord.js'
import {
  bold,
  ButtonStyle,
  ChannelType,
  ComponentType,
  escapeMarkdown,
  MessageFlags,
  SelectMenuDefaultValueType,
  SeparatorSpacingSize,
  TextInputStyle
} from 'discord.js'

import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'

export enum OptionType {
  Category = 'category',
  EmbedCategory = 'subcategory',
  Label = 'label',

  Text = 'text',
  Number = 'number',
  Boolean = 'boolean',

  Action = 'action',

  Channel = 'channel',
  Role = 'role'
}

export type OptionItem =
  | CategoryOption
  | LabelOption
  | TextOption
  | NumberOption
  | BooleanOption
  | ActionOption
  | DiscordSelectOption

interface BaseOption {
  type: OptionType
  id: string

  name: string
  description: string
}

export interface CategoryOption extends Omit<BaseOption, 'description'> {
  type: OptionType.Category | OptionType.EmbedCategory
  header: string | undefined
  options: OptionItem[]
}

export interface LabelOption extends BaseOption {
  type: OptionType.Label
  getOption: undefined | (() => string)
}

export interface BooleanOption extends BaseOption {
  type: OptionType.Boolean
  getOption: () => boolean
  toggleOption: () => void
}

export interface DiscordSelectOption extends BaseOption {
  type: OptionType.Channel | OptionType.Role
  getOption: () => string[]
  setOption: (value: string[]) => void
  max: number
  min: number
}

export interface TextOption extends BaseOption {
  type: OptionType.Text
  getOption: () => string
  setOption: (value: string) => void
  max: number
  min: number
}

export interface NumberOption extends BaseOption {
  type: OptionType.Number
  getOption: () => number
  setOption: (value: number) => void
  max: number
  min: number
}

export interface ActionOption extends BaseOption {
  type: OptionType.Action
  label: string
  style: ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Success | ButtonStyle.Danger
  onInteraction: (interaction: ButtonInteraction, errorHandler: UnexpectedErrorHandler) => Promise<boolean>
}

interface ViewBuildContext {
  titleCreated: boolean
  separatorApplied: boolean
  categoryEnded: boolean
}

export class OptionsHandler {
  private static readonly BackButton = 'back-button'
  private originalReply: InteractionResponse | undefined
  private enabled = true
  private path: string[] = []

  constructor(private readonly mainCategory: CategoryOption) {
    const uniqueId = new Set<string>()

    const allComponents = this.flattenOptions([this.mainCategory])
    for (const component of allComponents) {
      if (uniqueId.has(component.id)) {
        throw new Error(`Duplicate component id: ${component.id}`)
      }

      uniqueId.add(component.id)
    }
  }

  public async forwardInteraction(interaction: ChatInputCommandInteraction, errorHandler: UnexpectedErrorHandler) {
    this.originalReply = await interaction.reply({
      components: [this.createView()],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    })

    this.originalReply
      .createMessageComponentCollector({
        time: 300_000,
        filter: (messageInteraction) => messageInteraction.user.id === messageInteraction.user.id
      })
      .on('collect', (messageInteraction) => {
        void Promise.resolve()
          .then(async () => {
            const alreadyReplied = await this.handleInteraction(messageInteraction, errorHandler)

            await (alreadyReplied
              ? this.updateView()
              : messageInteraction.update({
                  components: [this.createView()],
                  flags: MessageFlags.IsComponentsV2
                }))
          })
          .catch(errorHandler.promiseCatch('updating container'))
      })
      .on('end', () => {
        this.enabled = false
        void this.updateView().catch(errorHandler.promiseCatch('updating container'))
      })
  }

  private async updateView(interaction?: ModalMessageModalSubmitInteraction): Promise<void> {
    if (interaction !== undefined) {
      await interaction.update({
        components: [this.createView()],
        flags: MessageFlags.IsComponentsV2
      })
      return
    }

    assert(this.originalReply)
    await this.originalReply.edit({
      components: [this.createView()],
      flags: MessageFlags.IsComponentsV2
    })
  }

  private createView(): ContainerComponentData {
    const components: ComponentInContainerData[] = []

    const context: ViewBuildContext = { titleCreated: false, separatorApplied: false, categoryEnded: false }
    components.push(...this.createCategoryView(context, this.getOption()))

    return {
      type: ComponentType.Container,
      components: components
    } satisfies ContainerComponentData
  }

  private createCategoryView(context: ViewBuildContext, categoryOption: CategoryOption): ComponentInContainerData[] {
    const components: ComponentInContainerData[] = []

    if (!context.titleCreated) {
      context.titleCreated = true

      const title = { type: ComponentType.TextDisplay, content: this.createTitle() }
      if (this.path.length === 0) {
        components.push(title)
      } else {
        components.push({
          type: ComponentType.Section,
          components: [title],
          accessory: {
            type: ComponentType.Button,

            label: 'Back',
            customId: OptionsHandler.BackButton,

            style: ButtonStyle.Secondary,
            disabled: !this.enabled
          }
        })
      }
      if (categoryOption.header !== undefined) {
        components.push({ type: ComponentType.TextDisplay, content: categoryOption.header })
      }

      components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Large })
      context.separatorApplied = true
    }

    for (const option of categoryOption.options) {
      switch (option.type) {
        case OptionType.Category: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.Section,
            components: [{ type: ComponentType.TextDisplay, content: bold(option.name) }],
            accessory: {
              type: ComponentType.Button,
              disabled: !this.enabled,
              label: 'Open',
              style: ButtonStyle.Primary,
              customId: option.id
            }
          } satisfies SectionComponentData)
          context.separatorApplied = false

          break
        }
        case OptionType.EmbedCategory: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          if (!context.separatorApplied) {
            components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
            context.separatorApplied = true
          }
          components.push({ type: ComponentType.TextDisplay, content: `## ${option.name}` })
          context.separatorApplied = false
          if (option.header !== undefined) {
            components.push({ type: ComponentType.TextDisplay, content: `-# ${option.header}` })
          }

          components.push(...this.createCategoryView(context, option))
          context.categoryEnded = true

          break
        }
        case OptionType.Label: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          let message = `**${option.name}**\n-# ${option.description}`
          if (option.getOption !== undefined) message += `\n-# **Current Value:** ${escapeMarkdown(option.getOption())}`
          components.push({ type: ComponentType.TextDisplay, content: message })
          context.separatorApplied = false

          break
        }
        case OptionType.Boolean: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.Section,
            components: [
              { type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }
            ],
            accessory: {
              type: ComponentType.Button,
              disabled: !this.enabled,
              label: option.getOption() ? 'ON' : 'OFF',
              style: option.getOption() ? ButtonStyle.Success : ButtonStyle.Secondary,
              customId: option.id
            }
          } satisfies SectionComponentData)
          context.separatorApplied = false

          break
        }
        case OptionType.Channel: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.TextDisplay,
            content: `${bold(option.name)}\n-# ${option.description}`
          })
          context.separatorApplied = false

          components.push({
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.ChannelSelect,
                customId: option.id,
                disabled: !this.enabled,
                minValues: option.min,
                maxValues: option.max,
                channelTypes: [ChannelType.GuildText],
                defaultValues: option.getOption().map((o) => ({ id: o, type: SelectMenuDefaultValueType.Channel }))
              }
            ]
          })

          break
        }
        case OptionType.Role: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.TextDisplay,
            content: `${bold(option.name)}\n-# ${option.description}`
          })
          context.separatorApplied = false
          components.push({
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.RoleSelect,
                customId: option.id,
                disabled: !this.enabled,
                minValues: option.min,
                maxValues: option.max,
                defaultValues: option.getOption().map((o) => ({ id: o, type: SelectMenuDefaultValueType.Role }))
              }
            ]
          })

          break
        }
        case OptionType.Text: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.Section,
            components: [
              { type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }
            ],
            accessory: {
              type: ComponentType.Button,
              disabled: !this.enabled,
              label: option.getOption(),
              style: ButtonStyle.Primary,
              customId: option.id
            }
          })
          context.separatorApplied = false

          break
        }
        case OptionType.Number: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.Section,
            components: [
              { type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }
            ],
            accessory: {
              type: ComponentType.Button,
              disabled: !this.enabled,
              label: option.getOption().toString(10),
              style: ButtonStyle.Primary,
              customId: option.id
            }
          })
          context.separatorApplied = false

          break
        }
        case OptionType.Action: {
          if (context.categoryEnded) {
            context.categoryEnded = false
            if (!context.separatorApplied) {
              components.push({ type: ComponentType.Separator, spacing: SeparatorSpacingSize.Small })
              context.separatorApplied = true
            }
          }

          components.push({
            type: ComponentType.Section,
            components: [
              { type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }
            ],
            accessory: {
              type: ComponentType.Button,
              disabled: !this.enabled,
              label: option.label,
              style: option.style,
              customId: option.id
            }
          } satisfies SectionComponentData)
          context.separatorApplied = false

          break
        }
        // No default
      }
    }

    return components
  }

  private async handleInteraction(
    interaction: CollectedInteraction,
    errorHandler: UnexpectedErrorHandler
  ): Promise<boolean> {
    if (interaction.customId === OptionsHandler.BackButton) {
      this.path.pop()
      return false
    }

    const modifiableOptions = this.flattenOptions([this.mainCategory])
    const option = modifiableOptions.find((option) => option.id === interaction.customId)
    assert(option !== undefined)

    if (option.type === OptionType.Category) {
      this.path.push(interaction.customId)
      return false
    }

    if (option.type === OptionType.Boolean) {
      option.toggleOption()
      return false
    }

    if (option.type === OptionType.Channel) {
      assert(interaction.isChannelSelectMenu())
      option.setOption(interaction.values)
      return false
    }
    if (option.type === OptionType.Role) {
      assert(interaction.isRoleSelectMenu())
      option.setOption(interaction.values)
      return false
    }

    if (option.type === OptionType.Text) {
      assert(interaction.isButton())
      await interaction.showModal({
        customId: option.id,
        title: `Setting ${option.name}`,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.TextInput,
                customId: option.id,
                style: TextInputStyle.Short,
                label: option.name,

                required: true,
                minLength: option.min,
                maxLength: option.max,
                value: option.getOption()
              }
            ]
          }
        ]
      })

      interaction
        .awaitModalSubmit({
          time: 300_000,
          filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
        })
        .then(async (modalInteraction) => {
          assert(modalInteraction.isFromMessage())

          const value = modalInteraction.fields.getTextInputValue(option.id)
          option.setOption(value)
          await this.updateView(modalInteraction)
        })
        .catch(errorHandler.promiseCatch(`handling modal submit for ${option.id}`))

      return true
    }

    if (option.type === OptionType.Number) {
      assert(interaction.isButton())
      await interaction.showModal({
        customId: option.id,
        title: `Setting ${option.name}`,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.TextInput,
                customId: option.id,
                style: TextInputStyle.Short,
                label: option.name,

                minLength: 1,
                required: true,
                value: option.getOption().toString(10)
              }
            ]
          }
        ]
      })

      interaction
        .awaitModalSubmit({
          time: 300_000,
          filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
        })
        .then(async (modalInteraction) => {
          assert(modalInteraction.isFromMessage())

          const value = modalInteraction.fields.getTextInputValue(option.id).trim()
          const intValue = Number.parseInt(value)
          if (intValue < option.min || intValue > option.max || value !== intValue.toString(10)) {
            await modalInteraction.reply({
              content: `**${option.name}** must be a number between ${option.min} and ${option.max}.\nGiven: ${escapeMarkdown(value)}`,
              ephemeral: true
            })
          } else {
            option.setOption(intValue)
            await this.updateView(modalInteraction)
          }
        })
        .catch(errorHandler.promiseCatch(`handling modal submit for ${option.id}`))

      return true
    }

    if (option.type === OptionType.Action) {
      assert(interaction.isButton())
      return await option.onInteraction(interaction, errorHandler)
    }

    return false
  }

  private getOption(): CategoryOption {
    let currentCategory = this.mainCategory
    for (const path of this.path) {
      let found = false
      for (const categoryOption of currentCategory.options) {
        if (categoryOption.id === path) {
          assert(categoryOption.type === OptionType.Category)

          currentCategory = categoryOption
          found = true
          break
        }
      }

      if (!found) throw new Error(`Can not find path to the category. Given: ${this.path.join(', ')}`)
    }

    return currentCategory
  }

  private createTitle(): string {
    let currentCategory = this.mainCategory
    let title = `# ${escapeMarkdown(currentCategory.name)}`

    for (const path of this.path) {
      let found = false
      for (const categoryOption of currentCategory.options) {
        if (categoryOption.id === path) {
          assert(categoryOption.type === OptionType.Category)

          currentCategory = categoryOption
          found = true
          title += ` > ${escapeMarkdown(categoryOption.name)}`
          break
        }
      }

      if (!found) throw new Error(`Can not find path to the category. Given: ${this.path.join(', ')}`)
    }

    return title
  }

  private flattenOptions(options: OptionItem[]): OptionItem[] {
    const flatOptions: OptionItem[] = []
    for (const option of options) {
      switch (option.type) {
        case OptionType.Category:
        case OptionType.EmbedCategory: {
          flatOptions.push(option)
          flatOptions.push(...this.flattenOptions(option.options))
          break
        }
        default: {
          flatOptions.push(option)
          break
        }
      }
    }

    return flatOptions
  }
}
