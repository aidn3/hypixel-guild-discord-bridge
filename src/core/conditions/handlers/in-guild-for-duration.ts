import assert from 'node:assert'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler.js'
import Duration from '../../../utility/duration.js'
import type {
  ConditionOption,
  ConditionResult,
  HandlerContext,
  HandlerDisplayContext,
  HandlerOperationContext,
  HandlerUser
} from '../common.js'
import { ConditionHandler, ConditionResultType } from '../common.js'
import { formatPrimitiveValue, noHypixelKey } from '../utilities.js'

export class InGuildForDuration extends ConditionHandler<InGuildOptions, number> {
  override getId(): string {
    return 'in-hypixel-guild-for-duration'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-for-duration.title'])
  }

  override async displayCondition(context: HandlerDisplayContext, options: InGuildOptions): Promise<string> {
    const hypixel = context.application.hypixel()
    if (hypixel === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-for-duration.formatted'], {
        guildName: options.guildId,
        fromDays: options.fromDays,
        toDays: options.toDays
      })
    }

    const guild = await hypixel.getGuildById(options.guildId)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.formatted-invalid'])
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-for-duration.formatted'], {
      guildName: guild.name,
      fromDays: options.fromDays,
      toDays: options.toDays
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    options: InGuildOptions
  ): Promise<ConditionResult<number>> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }
    const uuid = mojangProfile.id
    const hypixel = context.application.hypixel()
    if (hypixel === undefined) return noHypixelKey(context.application.i18n.t).meetsCondition
    const guild = await hypixel.getGuildById(options.guildId, context.startTime)
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

    const inGuildDays = (Date.now() - guildMember.joined) / Duration.days(1).toMilliseconds()
    return {
      type:
        inGuildDays >= options.fromDays && inGuildDays <= options.toDays
          ? ConditionResultType.Pass
          : ConditionResultType.Fail,
      value: inGuildDays,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, Math.floor(inGuildDays))
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
        name: 'From Days',
        key: 'fromDays',
        max: Number.MAX_SAFE_INTEGER,
        min: 0
      },
      {
        type: OptionType.Number,
        name: 'To Days',
        key: 'toDays',
        max: Number.MAX_SAFE_INTEGER,
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

    const fromDays = rawOptions.fromDays
    assert.ok(typeof fromDays === 'number')
    const toDays = rawOptions.toDays
    assert.ok(typeof toDays === 'number')

    const hypixel = context.application.hypixel()
    if (hypixel === undefined) return noHypixelKey(context.application.i18n.t).createCondition
    const guild = await hypixel.getGuildByName(guildName)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.invalid-name'])
    }

    return { guildId: guild._id, fromDays: fromDays, toDays: toDays }
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InGuildOptions = { guildId: string; fromDays: number; toDays: number }
