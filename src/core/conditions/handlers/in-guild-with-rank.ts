import assert from 'node:assert'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler'
import type {
  ConditionOption,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common'
import { ConditionHandler } from '../common'

export class InGuildWithRank extends ConditionHandler<InGuildOptions> {
  override getId(): string {
    return 'in-hypixel-guild-with-rank'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-with-rank.title'])
  }

  override async displayCondition(context: HandlerDisplayContext, options: InGuildOptions): Promise<string> {
    const guild = await context.application.hypixelApi.getGuildById(options.guildId)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.formatted-invalid'])
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-with-rank.formatted'], {
      guildName: guild.name,
      guildRank: options.guildRank
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: InGuildOptions
  ): Promise<boolean> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) return false
    const uuid = mojangProfile.id

    const guild = await context.application.hypixelApi.getGuildById(options.guildId, context.startTime)
    if (guild === undefined) return false

    return guild.members.some(
      (member) => member.uuid === uuid && member.rank?.toLowerCase() === options.guildRank.toLowerCase()
    )
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Text,
        style: InputStyle.Short,
        name: 'Guild Name',
        key: 'guildName',
        max: 150,
        min: 1
      },
      {
        type: OptionType.Text,
        style: InputStyle.Short,
        name: 'Guild Rank',
        key: 'guildRank',
        max: 50,
        min: 1
      }
    ]
  }

  override async createCondition(
    context: HandlerContext,
    rawOptions: ConditionOption
  ): Promise<InGuildOptions | string> {
    const guildName = rawOptions.guildName
    assert.ok(typeof guildName === 'string')

    const guildRank = rawOptions.guildRank
    assert.ok(typeof guildRank === 'string')

    const guild = await context.application.hypixelApi.getGuildByName(guildName)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.invalid-name'])
    }

    const foundRank = guild.ranks.find((entry) => entry.name.toLowerCase() === guildRank.toLowerCase().trim())
    if (foundRank === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-with-rank.invalid-rank'], {
        guildRank: guildRank,
        ranks: guild.ranks.map((rank) => rank.name)
      })
    }

    return { guildId: guild._id, guildRank: foundRank.name }
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InGuildOptions = { guildId: string; guildRank: string }
