// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler'
import {
  ConditionHandler,
  type ConditionOption,
  type ConditionResult,
  type HandlerContext,
  type HandlerDisplayContext,
  type HandlerOperationContext,
  type HandlerUser
} from '../common'
import { ConditionResultType } from '../common'

export interface GexpConditionOption extends Record<string, string | number | boolean | string[]> {
  days: number
  minimumGexp: number
}

export class GuildGexp extends ConditionHandler<GexpConditionOption, boolean> {
  public getId(): string {
    return 'guild-gexp-threshold'
  }

  public getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.guild-gexp.title'])
  }

  public displayCondition(context: HandlerDisplayContext, options: GexpConditionOption): string {
    return `≥ ${options.minimumGexp.toLocaleString('en-US')} GEXP over ${options.days} days`
  }

  public async meetsCondition(
    context: HandlerOperationContext,
    user: HandlerUser,
    condition: GexpConditionOption
  ): Promise<ConditionResult<boolean>> {
    const mojangProfile = user.user.mojangProfile()
    if (mojangProfile === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.not-linked'])
      }
    }

    const hypixelGuild = await context.application.hypixelApi.getGuildByPlayer(mojangProfile.id).catch(() => undefined)

    if (hypixelGuild === undefined) {
      return {
        type: ConditionResultType.Error,
        reason: 'Could not fetch Hypixel guild data'
      }
    }

    const member = hypixelGuild.members.find((m) => m.uuid === mojangProfile.id)
    if (member === undefined) {
      return {
        type: ConditionResultType.Fail,
        value: false,
        valueFormatted: 'No'
      }
    }

    const dates = Object.keys(member.expHistory).toSorted().toReversed()
    const daysToSum = Math.min(condition.days, dates.length)

    let totalGexp = 0
    for (let index = 0; index < daysToSum; index++) {
      totalGexp += member.expHistory[dates[index]]
    }

    const met = totalGexp >= condition.minimumGexp
    return {
      type: met ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: met,
      valueFormatted: met ? 'Yes' : 'No'
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Text,
        style: InputStyle.Short,
        key: 'days',
        name: 'Days',
        description: 'Number of days to check GEXP history (1-7)',
        max: 1,
        min: 1
      },
      {
        type: OptionType.Text,
        style: InputStyle.Short,
        key: 'minimumGexp',
        name: 'Minimum GEXP',
        description: 'Minimum required GEXP in the specified period (e.g. 100k, 1m)',
        max: 10,
        min: 1
      }
    ]
  }

  public override createCondition(context: HandlerContext, rawOptions: ConditionOption): GexpConditionOption | string {
    const days = rawOptions.days as number
    if (days < 1 || days > 7) {
      return 'Days must be an integer between 1 and 7.'
    }

    try {
      const minimumGexp = this.parseGexpShorthand(rawOptions.minimumGexp as string)
      return { days, minimumGexp }
    } catch {
      return 'Invalid GEXP input format. Use numbers or shorthand like 100k, 1.5m.'
    }
  }

  private parseGexpShorthand(input: string): number {
    if (!input) {
      throw new Error('Input is empty.')
    }

    const sanitized = input.trim().toLowerCase()
    let multiplier = 1

    if (sanitized.endsWith('k')) {
      multiplier = 1000
    } else if (sanitized.endsWith('m')) {
      multiplier = 1_000_000
    }

    const numberPart = multiplier === 1 ? sanitized : sanitized.slice(0, -1)
    const parsed = Number.parseFloat(numberPart)

    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`Invalid GEXP input: ${input}`)
    }

    return Math.floor(parsed * multiplier)
  }
}
