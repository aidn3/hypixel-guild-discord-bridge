// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler'
import { parseGexpShorthand } from '../../../utility/gexp-parser'
import {
  ConditionHandler,
  type ConditionOption,
  type HandlerContext,
  type HandlerDisplayContext,
  type HandlerOperationContext,
  type HandlerUser
} from '../common'

export interface GexpConditionOption extends Record<string, string | number | boolean | string[]> {
  days: number
  minimumGexp: number
}

export class GuildGexp extends ConditionHandler<GexpConditionOption> {
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
  ): Promise<boolean> {
    const mojangProfile = user.user.mojangProfile()
    if (mojangProfile === undefined) return false

    const hypixelGuild = await context.application.hypixelApi.getGuildByPlayer(mojangProfile.id).catch(() => undefined)

    if (hypixelGuild === undefined) return false

    const member = hypixelGuild.members.find((m) => m.uuid === mojangProfile.id)
    if (member === undefined) return false

    const dates = Object.keys(member.expHistory).toSorted().toReversed()
    const daysToSum = Math.min(condition.days, dates.length)

    let totalGexp = 0
    for (let index = 0; index < daysToSum; index++) {
      totalGexp += member.expHistory[dates[index]]
    }

    return totalGexp >= condition.minimumGexp
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
      const minimumGexp = parseGexpShorthand(rawOptions.minimumGexp as string)
      return { days, minimumGexp }
    } catch {
      return 'Invalid GEXP input format. Use numbers or shorthand like 100k, 1.5m.'
    }
  }
}
