import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { beautifyInstanceName } from '../../../util/shared-util.js'

export default class List extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['list', 'ls'],
      description: 'List online members in a guild',
      example: `list [GuildName] [page]`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const instances = context.app.minecraftManager
      .getAllInstances()
      .filter((instance) => instance.currentStatus() === Status.Connected)

    if (instances.length === 0) {
      return 'There are no connected Minecraft instances to query'
    } else if (instances.length === 1) {
      const instance = instances[0]

      const onlineMembers = await context.app.usersManager.guildManager.onlineMembers(instance.instanceName)
      const members = onlineMembers.flatMap((entry) => [...entry.usernames])
      if (members.length === 0) return `No one is online??`

      const pageRaw = context.args[0] ?? '1'
      return this.formatList(members, pageRaw)
    } else {
      const instanceName = context.args.length > 0 ? context.args[0] : undefined
      if (instanceName === undefined) {
        let totalCount = 0
        const tasks: Promise<string>[] = []
        for (const instance of instances) {
          tasks.push(
            context.app.usersManager.guildManager
              .onlineMembers(instance.instanceName)
              .then((onlineMembers) => onlineMembers.flatMap((entry) => [...entry.usernames]).length)
              .then((count) => {
                totalCount += count
                return `${beautifyInstanceName(instance.instanceName)} ${count}`
              })
              .catch(() => `${beautifyInstanceName(instance.instanceName)} N/A`)
          )
        }

        const responses = await Promise.all(tasks).then((entries) => entries.join(', '))
        return `Online (${totalCount}): ` + responses
      }

      const foundInstance = instances.find(
        (instance) => instance.instanceName.toLowerCase() === instanceName.toLowerCase()
      )
      if (foundInstance === undefined) {
        return `Can only query online Minecraft instances: ${instances.map((instance) => instance.instanceName).join(', ')}`
      }

      const onlineMembers = await context.app.usersManager.guildManager.onlineMembers(foundInstance.instanceName)
      const members = onlineMembers.flatMap((entry) => [...entry.usernames])
      if (members.length === 0) return `No one is online??`

      const pageRaw = context.args[1] ?? '1'
      return this.formatList(members, pageRaw)
    }
  }

  private formatList(members: string[], pageRaw: string): string {
    let page = /^\d+$/.test(pageRaw) ? Number.parseInt(pageRaw, 10) : 1

    const PageSize = 5
    const totalPages = Math.ceil(members.length / PageSize)
    page = Math.max(0, page)
    page = Math.min(totalPages, page)

    const chunk = members.slice((page - 1) * PageSize, page * PageSize)
    return `Online ${members.length} (page ${page}/${totalPages}): ${chunk.join(', ')}`
  }
}
