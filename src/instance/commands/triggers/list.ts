import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { beautifyInstanceName } from '../../../utility/shared-utility'

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

      const members = await this.onlineMembers(context, instance.instanceName)
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
            this.onlineMembers(context, instance.instanceName)
              .then((members) => {
                totalCount += members.length
                return `${beautifyInstanceName(instance.instanceName)} ${members.length}`
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

      const members = await this.onlineMembers(context, foundInstance.instanceName)
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

  private async onlineMembers(context: ChatCommandContext, instanceName: string): Promise<string[]> {
    const guild = await context.app.usersManager.guildManager.list(instanceName)
    return guild.members.filter((member) => member.online).map((member) => member.username)
  }
}
