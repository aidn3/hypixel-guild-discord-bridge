import assert from 'node:assert'

// eslint-disable-next-line import/no-restricted-paths
import type { ModalOption } from '../../../instance/discord/utility/modal-options.js'
// eslint-disable-next-line import/no-restricted-paths
import { InputStyle, OptionType } from '../../../instance/discord/utility/options-handler.js'
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

export class SkyblockGuildTopLevel extends ConditionHandler<InGuildOptions, number> {
  override getId(): string {
    return 'skyblock-guild-top-level'
  }

  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-guild-top-level.title'])
  }

  override async displayCondition(context: HandlerDisplayContext, options: InGuildOptions): Promise<string> {
    const hypixel = context.application.hypixel()
    if (hypixel === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-guild-top-level.formatted'], {
        topCount: options.topCount,
        guildName: options.guildId,
        guildRanks: options.whitelistedGuildRanks
      })
    }

    const guild = await hypixel.getGuildById(options.guildId)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.formatted-invalid'])
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.skyblock-guild-top-level.formatted'], {
      topCount: options.topCount,
      guildName: guild.name,
      guildRanks: options.whitelistedGuildRanks
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

    const memberRank = guildMember.rank ?? guild.ranks.find((rank) => rank.default)?.name ?? 'N/A'
    if (!options.whitelistedGuildRanks.map((rank) => rank.trim().toLowerCase()).includes(memberRank.toLowerCase())) {
      return {
        type: ConditionResultType.Error,
        reason: context.application.i18n.t(($) => $['conditions.format.in-guild-with-rank'], {
          rank: memberRank
        })
      }
    }

    const resolvedMembers: { uuid: string; experience: number }[] = []
    for (const member of guild.members.toSorted((a, b) => a.joined - b.joined)) {
      const skyblock = await hypixel.getSkyblockProfiles(member.uuid, context.startTime)
      if (skyblock === undefined) {
        resolvedMembers.push({ uuid: member.uuid, experience: 0 })
        continue
      }

      const allExperiences = skyblock.map((profile) => profile.members[member.uuid].leveling?.experience ?? 0)
      resolvedMembers.push({ uuid: member.uuid, experience: Math.max(...allExperiences) })
    }

    const sortedMembers = resolvedMembers.toSorted((a, b) => b.experience - a.experience)
    const index = sortedMembers.findIndex((member) => member.uuid === guildMember.uuid)
    const position = index + 1

    return {
      type: position <= options.topCount ? ConditionResultType.Pass : ConditionResultType.Fail,
      value: position,
      valueFormatted: formatPrimitiveValue(context.application.i18n.t, position)
    }
  }

  public override createOptions(): ModalOption[] {
    return [
      {
        type: OptionType.Number,
        name: 'Top Guild Members Count',
        key: 'topCount',
        max: 125,
        min: 1
      },
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
        name: 'Guild Rank(s)',
        description: 'separated by a comma, example: "Member, Trusted, Staff"',
        key: 'whitelistedGuildRanks',
        max: 150,
        min: 1
      }
    ]
  }

  override async createCondition(
    context: HandlerContext,
    rawOptions: ConditionOption
  ): Promise<InGuildOptions | string> {
    const topCount = rawOptions.topCount
    assert.ok(typeof topCount === 'number')

    const guildName = rawOptions.guildName
    assert.ok(typeof guildName === 'string')

    const rawGuildRank = rawOptions.whitelistedGuildRanks
    assert.ok(typeof rawGuildRank === 'string')
    const rawWhitelistedRanks = rawGuildRank
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0)

    const hypixel = context.application.hypixel()
    if (hypixel === undefined) return noHypixelKey(context.application.i18n.t).createCondition
    const guild = await hypixel.getGuildByName(guildName)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.invalid-name'])
    }

    const whitelistedGuildRanks: string[] = []

    for (const rawWhitelistedRank of rawWhitelistedRanks) {
      const foundRank = guild.ranks.find((entry) => entry.name.toLowerCase() === rawWhitelistedRank)
      if (foundRank === undefined) {
        return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild-with-rank.invalid-rank'], {
          guildRank: rawGuildRank,
          ranks: guild.ranks.map((rank) => rank.name)
        })
      }
      whitelistedGuildRanks.push(foundRank.name)
    }

    return { guildId: guild._id, whitelistedGuildRanks: whitelistedGuildRanks, topCount: topCount }
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InGuildOptions = { guildId: string; whitelistedGuildRanks: string[]; topCount: number }
