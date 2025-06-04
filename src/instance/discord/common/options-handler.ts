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
  | EmbedCategoryOption
  | LabelOption
  | TextOption
  | NumberOption
  | BooleanOption
  | ActionOption
  | DiscordSelectOption

interface BaseOption {
  type: OptionType

  name: string
  description: string
}

export interface CategoryOption extends Omit<BaseOption, 'description'> {
  type: OptionType.Category
  description?: string
  header: string | undefined
  options: OptionItem[]
}

export interface EmbedCategoryOption extends Omit<BaseOption, 'description'> {
  type: OptionType.EmbedCategory
  header: string | undefined
  options: Exclude<OptionItem, EmbedCategoryOption>[]
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

export class OptionsHandler {
  public static readonly BackButton = 'back-button'
  private originalReply: InteractionResponse | undefined
  private enabled = true
  private path: string[] = []
  private ids = new Map<string, OptionItem>()

  constructor(private readonly mainCategory: CategoryOption | EmbedCategoryOption) {
    let currentId = 0
    const allComponents = this.flattenOptions([this.mainCategory])
    for (const component of allComponents) {
      this.ids.set(`component-${currentId++}`, component)
    }
  }

  public async forwardInteraction(interaction: ChatInputCommandInteraction, errorHandler: UnexpectedErrorHandler) {
    this.originalReply = await interaction.reply({
      components: [new ViewBuilder(this.mainCategory, this.ids, this.path, this.enabled).create()],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    })

    this.originalReply
      .createMessageComponentCollector({
        time: 300_000,
        filter: (messageInteraction) => messageInteraction.user.id === interaction.user.id
      })
      .on('collect', (messageInteraction) => {
        void Promise.resolve()
          .then(async () => {
            const alreadyReplied = await this.handleInteraction(messageInteraction, errorHandler)

            await (alreadyReplied
              ? this.updateView()
              : messageInteraction.update({
                  components: [new ViewBuilder(this.mainCategory, this.ids, this.path, this.enabled).create()],
                  flags: MessageFlags.IsComponentsV2,
                  allowedMentions: { parse: [] }
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
        components: [new ViewBuilder(this.mainCategory, this.ids, this.path, this.enabled).create()],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] }
      })
      return
    }

    assert(this.originalReply)
    await this.originalReply.edit({
      components: [new ViewBuilder(this.mainCategory, this.ids, this.path, this.enabled).create()],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] }
    })
  }

  private async handleInteraction(
    interaction: CollectedInteraction,
    errorHandler: UnexpectedErrorHandler
  ): Promise<boolean> {
    if (interaction.customId === OptionsHandler.BackButton) {
      this.path.pop()
      return false
    }

    const option = this.ids.get(interaction.customId)
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
        customId: interaction.customId,
        title: `Setting ${option.name}`,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.TextInput,
                customId: interaction.customId,
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

          const value = modalInteraction.fields.getTextInputValue(interaction.customId)
          option.setOption(value)
          await this.updateView(modalInteraction)
        })
        .catch(errorHandler.promiseCatch(`handling modal submit for ${interaction.customId}`))

      return true
    }

    if (option.type === OptionType.Number) {
      assert(interaction.isButton())
      await interaction.showModal({
        customId: interaction.customId,
        title: `Setting ${option.name}`,
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.TextInput,
                customId: interaction.customId,
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

          const value = modalInteraction.fields.getTextInputValue(interaction.customId).trim()
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
        .catch(errorHandler.promiseCatch(`handling modal submit for ${interaction.customId}`))

      return true
    }

    if (option.type === OptionType.Action) {
      assert(interaction.isButton())
      return await option.onInteraction(interaction, errorHandler)
    }

    return false
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

class ViewBuilder {
  private hasCreated = false

  private titleCreated = false
  private separatorApplied = false
  private categoryEnded = false
  private components: ComponentInContainerData[] = []

  constructor(
    private readonly mainCategory: CategoryOption | EmbedCategoryOption,
    private readonly ids: Map<string, OptionItem>,
    private readonly path: string[],
    private readonly enabled: boolean
  ) {}

  public create(): ContainerComponentData {
    if (this.hasCreated) throw new Error('This instance has already been used to create a view.')
    this.hasCreated = true

    this.createCategoryView(this.getOption())
    return { type: ComponentType.Container, components: this.components } satisfies ContainerComponentData
  }

  private createCategoryView(categoryOption: CategoryOption | EmbedCategoryOption): void {
    this.addTitleIfPossible(categoryOption)

    for (const option of categoryOption.options) {
      this.handleEndCategory()

      switch (option.type) {
        case OptionType.Category: {
          this.addCategory(option)
          break
        }
        case OptionType.EmbedCategory: {
          this.addEmbedCategory(option)
          break
        }
        case OptionType.Label: {
          this.addLabel(option)

          break
        }
        case OptionType.Boolean: {
          this.addBoolean(option)
          break
        }
        case OptionType.Channel: {
          this.addChannel(option)
          break
        }
        case OptionType.Role: {
          this.addRole(option)
          break
        }
        case OptionType.Text: {
          this.addText(option)
          break
        }
        case OptionType.Number: {
          this.addNumber(option)
          break
        }
        case OptionType.Action: {
          this.addAction(option)
          break
        }
        // No default
      }
    }
  }

  private addTitleIfPossible(currentCategory: CategoryOption | EmbedCategoryOption) {
    if (!this.titleCreated) {
      this.titleCreated = true

      const title = { type: ComponentType.TextDisplay, content: this.createTitle() }
      if (this.path.length === 0) {
        this.append(title)
      } else {
        this.append({
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
      if (currentCategory.header !== undefined) {
        this.append({ type: ComponentType.TextDisplay, content: currentCategory.header })
      }

      this.tryApplySeperator(SeparatorSpacingSize.Large)
    }
  }

  private addCategory(option: CategoryOption): void {
    this.append({
      type: ComponentType.Section,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${bold(option.name)}${option.description === undefined ? '' : `\n-# ${option.description}`}`
        }
      ],
      accessory: {
        type: ComponentType.Button,
        disabled: !this.enabled,
        label: 'Open',
        style: ButtonStyle.Primary,
        customId: this.getId(option)
      }
    } satisfies SectionComponentData)
  }

  private addEmbedCategory(option: EmbedCategoryOption): void {
    this.tryApplySeperator(SeparatorSpacingSize.Small)

    this.append({ type: ComponentType.TextDisplay, content: `## ${option.name}` })

    if (option.header !== undefined) {
      this.append({ type: ComponentType.TextDisplay, content: `-# ${option.header}` })
    }

    this.createCategoryView(option)
    this.categoryEnded = true
  }

  private addLabel(option: LabelOption): void {
    let message = `**${option.name}**\n-# ${option.description}`
    if (option.getOption !== undefined) message += `\n-# **Current Value:** ${escapeMarkdown(option.getOption())}`
    this.append({ type: ComponentType.TextDisplay, content: message })
  }

  private addBoolean(option: BooleanOption): void {
    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }],
      accessory: {
        type: ComponentType.Button,
        disabled: !this.enabled,
        label: option.getOption() ? 'ON' : 'OFF',
        style: option.getOption() ? ButtonStyle.Success : ButtonStyle.Secondary,
        customId: this.getId(option)
      }
    })
  }

  private addChannel(option: DiscordSelectOption): void {
    assert(option.type === OptionType.Channel)

    this.append({ type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` })

    this.append({
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.ChannelSelect,
          customId: this.getId(option),
          disabled: !this.enabled,
          minValues: option.min,
          maxValues: option.max,
          channelTypes: [ChannelType.GuildText],
          defaultValues: option.getOption().map((o) => ({ id: o, type: SelectMenuDefaultValueType.Channel }))
        }
      ]
    })
  }

  private addRole(option: DiscordSelectOption): void {
    this.append({ type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` })

    this.append({
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.RoleSelect,
          customId: this.getId(option),
          disabled: !this.enabled,
          minValues: option.min,
          maxValues: option.max,
          defaultValues: option.getOption().map((o) => ({ id: o, type: SelectMenuDefaultValueType.Role }))
        }
      ]
    })
  }

  private addText(option: TextOption): void {
    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }],
      accessory: {
        type: ComponentType.Button,
        disabled: !this.enabled,
        label: option.getOption(),
        style: ButtonStyle.Primary,
        customId: this.getId(option)
      }
    })
  }

  private addNumber(option: NumberOption): void {
    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }],
      accessory: {
        type: ComponentType.Button,
        disabled: !this.enabled,
        label: option.getOption().toString(10),
        style: ButtonStyle.Primary,
        customId: this.getId(option)
      }
    })
  }

  private addAction(option: ActionOption): void {
    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: `${bold(option.name)}\n-# ${option.description}` }],
      accessory: {
        type: ComponentType.Button,
        disabled: !this.enabled,
        label: option.label,
        style: option.style,
        customId: this.getId(option)
      }
    })
  }

  private handleEndCategory(): void {
    if (this.categoryEnded) {
      this.categoryEnded = false
      this.tryApplySeperator(SeparatorSpacingSize.Small)
    }
  }

  private append(component: ComponentInContainerData): void {
    assert(component.type !== ComponentType.Separator, 'use applySeperator() instead')

    this.components.push(component)
    this.separatorApplied = false
  }

  private tryApplySeperator(size: SeparatorSpacingSize): void {
    if (this.separatorApplied) return
    this.components.push({ type: ComponentType.Separator, spacing: size })
    this.separatorApplied = true
  }

  private getOption(): CategoryOption | EmbedCategoryOption {
    if (this.path.length === 0) return this.mainCategory

    const lastPath = this.path.at(-1)
    assert(lastPath)

    const category = this.ids.get(lastPath)
    assert(category !== undefined, `Can not find path to the category. Given: ${this.path.join(', ')}`)
    assert(category.type === OptionType.Category || category.type === OptionType.EmbedCategory)

    return category
  }

  private createTitle(): string {
    let title = `# ${escapeMarkdown(this.mainCategory.name)}`

    for (const path of this.path) {
      const categoryOption = this.ids.get(path)
      assert(categoryOption !== undefined, `Can not find path to the category. Given: ${this.path.join(', ')}`)
      title += ` > ${escapeMarkdown(categoryOption.name)}`
    }

    return title
  }

  private getId(option: OptionItem): string {
    for (const [id, optionEntry] of this.ids.entries()) {
      if (option === optionEntry) return id
    }
    throw new Error(`could not find id for option name ${option.name}`)
  }
}
