import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { Status } from '../../../common/connectable-instance.js'
import { searchObjects } from '../../../utility/shared-utility'

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

      const guild = await instance.guildManager.list()
      const members = guild.members.filter((member) => member.online).map((member) => member.username)
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
            instance.guildManager
              .list()
              .then((guild) => {
                const members = guild.members.filter((member) => member.online).map((member) => member.username)
                totalCount += members.length
                return `${guild.name} ${members.length}`
              })
              .catch(() => `${instance.getConfigName()} N/A`)
          )
        }

        const responses = await Promise.all(tasks).then((entries) => entries.join(', '))
        return `Online (${totalCount}): ` + responses
      }

      const foundInstance = searchObjects(instanceName, instances, (instance) => instance.getConfigName()).at(0)
      if (foundInstance === undefined) {
        return `Can only query online Minecraft instances: ${instances.map((instance) => instance.getConfigName()).join(', ')}`
      }

      const guild = await foundInstance.guildManager.list()
      const members = guild.members.filter((member) => member.online).map((member) => member.username)
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
