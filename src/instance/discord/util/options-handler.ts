import assert from 'node:assert'
import * as crypto from 'node:crypto'

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

  List = 'list',

  Action = 'action',

  Channel = 'channel',
  Role = 'role',
  User = 'user'
}

export type OptionItem =
  | CategoryOption
  | EmbedCategoryOption
  | LabelOption
  | TextOption
  | NumberOption
  | BooleanOption
  | ListOption
  | ActionOption
  | DiscordSelectOption

interface BaseOption {
  type: OptionType

  name: string
  description?: string
}

export interface CategoryOption extends BaseOption {
  type: OptionType.Category
  header?: string
  options: OptionItem[]
}

export interface EmbedCategoryOption extends BaseOption {
  type: OptionType.EmbedCategory
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
  type: OptionType.Channel | OptionType.Role | OptionType.User
  getOption: () => string[]
  setOption: (value: string[]) => void
  max: number
  min: number
}

export interface ListOption extends BaseOption {
  type: OptionType.List
  getOption: () => string[]
  setOption: (value: string[]) => void
  style: InputStyle
  max: number
  min: number
}

export enum InputStyle {
  Short = 'short',
  Long = 'long'
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

interface OptionId {
  action: 'default' | 'add' | 'delete'
  item: OptionItem
}

export class OptionsHandler {
  public static readonly BackButton = 'back-button'
  private originalReply: InteractionResponse | undefined
  private enabled = true
  private path: string[] = []
  private ids = new Map<string, OptionId>()

  constructor(private readonly mainCategory: CategoryOption | EmbedCategoryOption) {
    let currentId = 0
    const allComponents = this.flattenOptions([this.mainCategory])
    for (const component of allComponents) {
      this.ids.set(`component-${currentId++}`, { action: 'default', item: component })

      if (component.type === OptionType.List) {
        this.ids.set(`component-${currentId++}`, { action: 'add', item: component })
        this.ids.set(`component-${currentId++}`, { action: 'delete', item: component })
      }
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

    const foundOption = this.ids.get(interaction.customId)
    assert(foundOption !== undefined)
    const option = foundOption.item
    const action = foundOption.action

    if (option.type === OptionType.Category) {
      assert(action === 'default')

      this.path.push(interaction.customId)
      return false
    }

    if (option.type === OptionType.Boolean) {
      assert(action === 'default')

      option.toggleOption()
      return false
    }

    if (option.type === OptionType.Channel) {
      assert(action === 'default')

      assert(interaction.isChannelSelectMenu())
      option.setOption(interaction.values)
      return false
    }

    if (option.type === OptionType.Role) {
      assert(action === 'default')

      assert(interaction.isRoleSelectMenu())
      option.setOption(interaction.values)
      return false
    }

    if (option.type === OptionType.User) {
      assert(action === 'default')

      assert(interaction.isUserSelectMenu())
      option.setOption(interaction.values)
      return false
    }

    if (option.type === OptionType.Text) {
      assert(action === 'default')

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
      assert(action === 'default')

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
          const intValue = value.includes('.') ? Number.parseFloat(value) : Number.parseInt(value, 10)
          if (intValue < option.min || intValue > option.max || value !== intValue.toString(10)) {
            await modalInteraction.reply({
              content: `**${option.name}** must be a number between ${option.min} and ${option.max}.\nGiven: ${escapeMarkdown(value)}`,
              flags: MessageFlags.Ephemeral
            })
          } else {
            option.setOption(intValue)
            await this.updateView(modalInteraction)
          }
        })
        .catch(errorHandler.promiseCatch(`handling modal submit for ${interaction.customId}`))

      return true
    }

    if (option.type === OptionType.List) {
      if (action === 'add') {
        return await this.handleListAdd(interaction, option)
      } else if (action === 'delete') {
        return this.handleListDelete(interaction, option)
      }
    }

    if (option.type === OptionType.Action) {
      assert(action === 'default')

      assert(interaction.isButton())
      return await option.onInteraction(interaction, errorHandler)
    }

    return false
  }

  private async handleListAdd(interaction: CollectedInteraction, option: ListOption): Promise<boolean> {
    assert(interaction.isButton())

    await interaction.showModal({
      customId: interaction.customId,
      title: `Adding To ${option.name}`,
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.TextInput,
              customId: interaction.customId,
              style: option.style === InputStyle.Short ? TextInputStyle.Short : TextInputStyle.Paragraph,
              label: option.name,

              minLength: 1,
              required: true
            }
          ]
        }
      ]
    })

    const modalInteraction = await interaction.awaitModalSubmit({
      time: 300_000,
      filter: (modalInteraction) => modalInteraction.user.id === interaction.user.id
    })
    assert(modalInteraction.isFromMessage())

    const value = modalInteraction.fields.getTextInputValue(interaction.customId).trim()
    const allOptions = option.getOption()

    if (allOptions.includes(value)) {
      await modalInteraction.reply({
        content: `Value already added to **${option.name}**.`,
        flags: MessageFlags.Ephemeral
      })
    } else {
      option.setOption([...allOptions, value])
      await this.updateView(modalInteraction)
    }

    return true
  }

  private handleListDelete(interaction: CollectedInteraction, option: ListOption): boolean {
    assert(interaction.isStringSelectMenu())

    const valuesToDelete = interaction.values
    const allOptions = option.getOption()
    const newValues = allOptions.filter((value) => !valuesToDelete.includes(hashOptionValue(value)))

    assert.notStrictEqual(allOptions.length, newValues.length)
    option.setOption(newValues)

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
    private readonly ids: Map<string, OptionId>,
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
        case OptionType.List: {
          this.addList(option)
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
        case OptionType.User: {
          this.addUser(option)
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
      if ('header' in currentCategory && currentCategory.header !== undefined) {
        this.append({ type: ComponentType.TextDisplay, content: currentCategory.header })
      } else if (currentCategory.description !== undefined) {
        this.append({ type: ComponentType.TextDisplay, content: currentCategory.description })
      }

      this.tryApplySeperator(SeparatorSpacingSize.Large)
    }
  }

  private addCategory(option: CategoryOption): void {
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`

    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: label }],
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

    let label = `## ${option.name}`
    if (option.description !== undefined) label += `\n-# ${option.description}`

    this.append({ type: ComponentType.TextDisplay, content: label })

    this.createCategoryView(option)
    this.categoryEnded = true
  }

  private addLabel(option: LabelOption): void {
    let message = `**${option.name}**`
    if (option.description !== undefined) message += `\n-# ${option.description}`
    if (option.getOption !== undefined) message += `\n-# **Current Value:** ${escapeMarkdown(option.getOption())}`
    this.append({ type: ComponentType.TextDisplay, content: message })
  }

  private addBoolean(option: BooleanOption): void {
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`

    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: label }],
      accessory: {
        type: ComponentType.Button,
        disabled: !this.enabled,
        label: option.getOption() ? 'ON' : 'OFF',
        style: option.getOption() ? ButtonStyle.Success : ButtonStyle.Secondary,
        customId: this.getId(option)
      }
    })
  }

  private addList(option: ListOption): void {
    const addAction = [...this.ids.entries()].find(([, entry]) => entry.item === option && entry.action === 'add')
    assert(addAction !== undefined, 'Could not find add action?')

    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`
    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: label }],
      accessory: {
        type: ComponentType.Button,
        customId: addAction[0],
        label: 'Add',
        style: ButtonStyle.Primary
      }
    })

    const deleteAction = [...this.ids.entries()].find(([, entry]) => entry.item === option && entry.action === 'delete')
    assert(deleteAction !== undefined, 'Could not find delete action?')

    const mentionedValues = new Set<string>()
    const values = []
    for (const value of option.getOption()) {
      if (mentionedValues.has(value)) continue
      mentionedValues.add(value)

      values.push({
        label: value.length > 100 ? value.slice(0, 97) + '...' : value,
        value: hashOptionValue(value)
      })
    }

    if (values.length > 0) {
      this.append({
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.StringSelect,
            customId: deleteAction[0],
            disabled: !this.enabled,
            placeholder: 'Select from the list to DELETE.',

            minValues: option.min,
            maxValues: Math.min(values.length, option.max),

            options: values
          }
        ]
      })
    } else {
      this.append({
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.StringSelect,
            customId: deleteAction[0],
            disabled: true,
            placeholder: '(empty)',

            minValues: 0,
            maxValues: 1,

            options: [{ label: '(empty)', value: '0' }]
          }
        ]
      })
    }
  }

  private addChannel(option: DiscordSelectOption): void {
    assert(option.type === OptionType.Channel)

    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`
    this.append({ type: ComponentType.TextDisplay, content: label })

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
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`
    this.append({ type: ComponentType.TextDisplay, content: label })

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

  private addUser(option: DiscordSelectOption): void {
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`
    this.append({ type: ComponentType.TextDisplay, content: label })

    this.append({
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.UserSelect,
          customId: this.getId(option),
          disabled: !this.enabled,
          minValues: option.min,
          maxValues: option.max,
          defaultValues: option.getOption().map((o) => ({ id: o, type: SelectMenuDefaultValueType.User }))
        }
      ]
    })
  }

  private addText(option: TextOption): void {
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`

    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: label }],
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
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`

    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: label }],
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
    let label = bold(option.name)
    if (option.description !== undefined) label += `\n-# ${option.description}`

    this.append({
      type: ComponentType.Section,
      components: [{ type: ComponentType.TextDisplay, content: label }],
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

    const category = this.ids.get(lastPath)?.item
    assert(category !== undefined, `Can not find path to the category. Given: ${this.path.join(', ')}`)
    assert(category.type === OptionType.Category || category.type === OptionType.EmbedCategory)

    return category
  }

  private createTitle(): string {
    let title = `# ${escapeMarkdown(this.mainCategory.name)}`

    for (const path of this.path) {
      const categoryOption = this.ids.get(path)?.item
      assert(categoryOption !== undefined, `Can not find path to the category. Given: ${this.path.join(', ')}`)
      title += ` > ${escapeMarkdown(categoryOption.name)}`
    }

    return title
  }

  private getId(option: OptionItem): string {
    for (const [id, optionEntry] of this.ids.entries()) {
      if (option === optionEntry.item) return id
    }
    throw new Error(`could not find id for option name ${option.name}`)
  }
}

function hashOptionValue(value: string): string {
  return crypto.hash('sha256', value)
}
