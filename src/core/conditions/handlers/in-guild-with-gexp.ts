import assert from 'node:assert'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler'
import Duration from '../../../utility/duration'
import type {
  ConditionOption,
  ConditionResult,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common'
import { ConditionHandler, ConditionResultType } from '../common'
import { formatPrimitiveValue } from '../utilities'

export class InGuildWithGexp extends ConditionHandler<InGuildGexpOptions, number> {
  override getId(): string {
    return 'in-hypixel-guild-with-gexp'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['conditions.in-guild-with-gexp.title'])
  }

  override async displayCondition(context: HandlerDisplayContext, options: InGuildGexpOptions): Promise<string> {
    const guild = await context.application.hypixelApi.getGuildById(options.guildId)
    const guildName = guild?.name ?? options.guildId

    return context.application.i18n.t(($) => $['conditions.in-guild-with-gexp.description'], {
      guildName: guildName,
      gexp: options.gexp,
      days: options.days
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: InGuildGexpOptions
  ): Promise<ConditionResult<number>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }
    const uuid = mojangProfile.id

    const guild = await context.application.hypixelApi.getGuildById(options.guildId, context.startTime)
    if (guild === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.guild-disbanded'])
      }
    }

    const guildMember = guild.members.find((member) => member.uuid === uuid)
    if (guildMember === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-in-guild'])
      }
    }

    const officialGexpHistory = Object.values(guildMember.expHistory)

    let gexp = 0
    if (options.days <= officialGexpHistory.length) {
      gexp += officialGexpHistory.slice(-1, -options.days).reduce((a, b) => a + b, 0)
    } else {
      const savedGexp = context.application.minecraftGuildsManager.getAndSupplementedMemberGexp(
        guild,
        uuid,
        options.days
      )
      gexp += savedGexp.map((entry) => entry.value).reduce((a, b) => a + b, 0)
    }

    return {
      type: gexp >= options.gexp ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: gexp,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, gexp)
    }
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
        type: OptionType.Number,
        name: 'GEXP',
        key: 'gexp',
        max: Number.MAX_SAFE_INTEGER,
        min: 0
      },
      {
        type: OptionType.Number,
        name: 'Days',
        key: 'days',
        max: Duration.years(10).toDays(),
        min: 1
      }
    ]
  }

  override async createCondition(
    context: HandlerContext,
    rawOptions: ConditionOption
  ): Promise<InGuildGexpOptions | string> {
    const guildName = rawOptions.guildName
    assert.ok(typeof guildName === 'string')
    const gexp = rawOptions.gexp
    assert.ok(typeof gexp === 'number')
    const days = rawOptions.days
    assert.ok(typeof days === 'number')

    const guild = await context.application.hypixelApi.getGuildByName(guildName)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.invalid-name'])
    }

    return { guildId: guild._id, gexp: Math.floor(gexp), days: Math.floor(days) }
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InGuildGexpOptions = { guildId: string; gexp: number; days: number }
