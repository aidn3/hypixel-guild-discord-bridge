import { Permission, PunishmentPurpose } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'

export default class Command67 extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['67'],
      description: 'It is 67!',
      example: `67`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (context.message.user.permission() < Permission.Helper && !context.message.user.immune()) {
      await context.message.user.mute(
        context.eventHelper.fillBaseEvent(),
        PunishmentPurpose.Game,
        Duration.minutes(3),
        `Used command ${context.commandPrefix}${this.triggers[0]}`
      )
    }

    return context.app.i18n.t(($) => $['commands.67'], {
      username: context.message.user.displayName(),
      command: `${context.commandPrefix}${this.triggers[0]}`
    })
  }
}
