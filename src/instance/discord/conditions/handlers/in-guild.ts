import assert from 'node:assert'

import type { ConditionOption } from '../../../../core/discord/user-conditions'
import type { ModalOption } from '../../utility/modal-options'
import { InputStyle, OptionType } from '../../utility/options-handler'
import type { HandlerContext, UpdateMemberContext } from '../common'
import { ConditionHandler } from '../common'

export class InGuild extends ConditionHandler<InGuildOptions> {
  override getId(): string {
    return 'in-hypixel-guild'
  }
  override getDisplayName(context: HandlerContext): string {
    return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.title'])
  }

  override async displayCondition(context: UpdateMemberContext, options: InGuildOptions): Promise<string> {
    const guild = await context.application.hypixelApi.getGuildById(options.guildId)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.formatted-invalid'])
    }

    return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.formatted'], {
      guildName: guild.name
    })
  }

  override async meetsCondition(context: UpdateMemberContext, options: InGuildOptions): Promise<boolean> {
    const mojangProfile = context.user.mojangProfile()
    if (mojangProfile === undefined) return false
    const uuid = mojangProfile.id

    const guild = await context.application.hypixelApi.getGuildById(options.guildId, context.startTime)
    if (guild === undefined) return false

    return guild.members.some((member) => member.uuid === uuid)
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
      }
    ]
  }

  override async createCondition(
    context: HandlerContext,
    rawOptions: ConditionOption
  ): Promise<InGuildOptions | string> {
    const guildName = rawOptions.guildName
    assert.ok(typeof guildName === 'string')

    const guild = await context.application.hypixelApi.getGuildByName(guildName)
    if (guild === undefined) {
      return context.application.i18n.t(($) => $['discord.conditions.handler.in-guild.invalid-name'])
    }

    return { guildId: guild._id }
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type InGuildOptions = { guildId: string }
