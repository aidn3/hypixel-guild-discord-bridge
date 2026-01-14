import type { GuildMemberEditOptions } from 'discord.js'

import type { ConditionOption } from '../../../core/discord/user-conditions'
import { OnUnmet } from '../../../core/discord/user-conditions'

import type { ConditionHandler, UpdateMemberContext } from './common'
import { formatPlaceholder } from './nickname-formatter'

export class HandlersRegistry {
  private readonly handlers = new Map<string, ConditionHandler<ConditionOption>>()

  public allHandlers(): ConditionHandler<ConditionOption>[] {
    return [...this.handlers.values()]
  }

  public registerHandler(handler: ConditionHandler<ConditionOption>): void {
    const id = handler.getId()
    if (this.handlers.has(id)) {
      throw new Error(`handler id ${id} already registered`)
    }

    this.handlers.set(id, handler)
  }

  /**
   * Resolve what to update in a guild member.
   * Note if {@link context#abortSignal} is aborted, <code>undefined</code> is returned.
   */
  public async updateMember(context: UpdateMemberContext): Promise<GuildMemberEditOptions | undefined> {
    if (context.abortSignal.aborted) return undefined

    const editOptions: GuildMemberEditOptions = {}
    await this.updateRoles(context, editOptions)
    await this.updateNicknames(context, editOptions)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (context.abortSignal.aborted) return undefined
    return Object.keys(editOptions).length > 0 ? editOptions : undefined
  }

  private async updateRoles(
    context: Readonly<UpdateMemberContext>,
    editPayload: GuildMemberEditOptions
  ): Promise<void> {
    const assignedRoles = new Set<string>(context.member.roles.cache.keys())
    let changed = false

    for (const condition of context.rolesConditions) {
      if (context.abortSignal.aborted) return undefined
      context.progress.processedRoles++

      const handler = this.handlers.get(condition.typeId)
      if (handler === undefined) throw new Error(`handler id ${condition.typeId} not found.`)

      let meetsCondition: boolean
      try {
        meetsCondition = await handler.meetsCondition(context, condition.options)
      } catch {
        meetsCondition = false
      }

      const assignedRolesSize = assignedRoles.size
      if (meetsCondition) {
        assignedRoles.add(condition.roleId)
      } else if (condition.onUnmet === OnUnmet.Remove) {
        assignedRoles.delete(condition.roleId)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (condition.onUnmet === OnUnmet.Keep) {
        // do nothing
      } else {
        condition.onUnmet satisfies never
      }

      if (assignedRolesSize !== assignedRoles.size) {
        changed = true
      }
    }

    if (changed) editPayload.roles = [...assignedRoles]
  }

  private async updateNicknames(
    context: Readonly<UpdateMemberContext>,
    editPayload: GuildMemberEditOptions
  ): Promise<void> {
    for (const condition of context.nicknameConditions) {
      if (context.abortSignal.aborted) return undefined
      context.progress.processedNicknames++

      const handler = this.handlers.get(condition.typeId)
      if (handler === undefined) throw new Error(`handler id ${condition.typeId} not found.`)

      let meetsCondition: boolean
      try {
        meetsCondition = await handler.meetsCondition(context, condition.options)
      } catch {
        meetsCondition = false
      }

      if (meetsCondition) {
        const formatted = formatPlaceholder(context, condition)
        if (formatted !== undefined) editPayload.nick = formatted
      }
    }
  }
}
