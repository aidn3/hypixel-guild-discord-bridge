import { ProfileNetworthCalculator } from 'skyhelper-networth'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler'
import type {
  ConditionOption,
  HandlerContext,
  HandlerOperationContext,
  HandlerUser,
  SkyblockProfileOptionType
} from '../common'
import { ConditionHandler, SkyblockProfileOption, translateSkyblockProfileTypes } from '../common'

export class SkyblockNetworth extends ConditionHandler<SkyblockNetworthOptions> {
  override getId(): string {
    return 'hypixel-skyblock-networth'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-networth.title'])
  }

  override displayCondition(context: HandlerContext, options: SkyblockNetworthOptions): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-networth.formatted'], {
      fromValue: options.fromValue,
      toValue: options.toValue,
      profileTypes: translateSkyblockProfileTypes(options.profileTypes)
    })
  }

  override async meetsCondition(
    context: HandlerOperationContext,
    handlerUser: HandlerUser,
    condition: SkyblockNetworthOptions
  ): Promise<boolean> {
    const mojangProfile = handlerUser.user.mojangProfile()
    if (mojangProfile === undefined) return false
    const uuid = mojangProfile.id

    const profiles = await context.application.hypixelApi.getSkyblockProfiles(uuid, context.startTime)
    if (!profiles) return false
    for (const profile of profiles) {
      const profileType = profile.game_mode ?? 'classic'
      if (!condition.profileTypes.includes(profileType)) continue

      const museumData = await context.application.hypixelApi
        .getSkyblockMuseum(profile.profile_id, context.startTime)
        .then((museum) => museum.members[uuid] as object)

      const calculator = new ProfileNetworthCalculator(profile.members[uuid], museumData, profile.banking?.balance ?? 0)
      const networth = await calculator.getNetworth({ onlyNetworth: true }).then((response) => response.networth)
      if (condition.fromValue <= networth && condition.toValue >= networth) return true
    }

    return false
  }

  override createCondition(context: HandlerContext, rawOptions: ConditionOption): string | SkyblockNetworthOptions {
    const fromValue = this.parseNumber(rawOptions.fromValue as string)
    if (typeof fromValue === 'string') return fromValue
    const toValue = this.parseNumber(rawOptions.toValue as string)
    if (typeof toValue === 'string') return toValue

    return { profileTypes: rawOptions.profileTypes as SkyblockProfileOptionType['profileTypes'], fromValue, toValue }
  }

  public override createOptions(): ModalOption[] {
    return [
      SkyblockProfileOption,
      {
        type: OptionType.Text,
        style: InputStyle.Short,
        name: 'From Skyblock Networth',
        key: 'fromValue',
        max: 100,
        min: 1
      },
      {
        type: OptionType.Text,
        style: InputStyle.Short,
        name: 'To Skyblock Networth',
        key: 'toValue',
        max: 100,
        min: 1
      }
    ]
  }

  private parseNumber(short: string): number | string {
    const sanitized = short.replaceAll('.', '').replaceAll(',', '')
    const regex = /^(\d*)([kmbt]*)$/g
    const match = regex.exec(sanitized)

    if (match != undefined) {
      const time = match[1] as unknown as number
      const suffice = match[2]
      return time * this.sufficeToNumber(suffice)
    }

    return `Invalid number. given: ${short}`
  }

  private sufficeToNumber(suffice: string): number {
    suffice = suffice.toLowerCase().trim()

    if (suffice === 'k') return 1000
    if (suffice === 'm') return 1_000_000
    if (suffice === 'b') return 1_000_000_000
    if (suffice === 't') return 1_000_000_000

    return 1
  }
}

export type SkyblockNetworthOptions = SkyblockProfileOptionType & { fromValue: number; toValue: number }
