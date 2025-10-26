import { ChannelType } from '../../../common/application-event'
import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Select extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['select', 'ifl'],
      description: 'Randomly select an online guild member',
      example: `select great person!`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    if (![ChannelType.Public, ChannelType.Officer].includes(context.message.channelType)) {
      return `${context.username}, Command can only be executed in public and officer chat!`
    }

    const usernames = await this.getUsernames(context)
    if (usernames.length === 0) return 'No guild member to select :('

    const selectedUsername = usernames[Math.floor(Math.random() * usernames.length)]

    const givenMessage = context.args
      .map((argument) => argument.trim())
      .filter((argument) => argument.length > 0)
      .join(' ')

    return givenMessage.length > 0
      ? `${selectedUsername} => ${givenMessage}`
      : `${selectedUsername} has been randomly selected!`
  }

  private async getUsernames(context: ChatCommandContext): Promise<string[]> {
    const instances = context.app.minecraftManager.getAllInstances()

    const usernames: Promise<string[]>[] = []
    for (const instance of instances) {
      const chunk = context.app.core.guildManager
        .list(instance.instanceName)
        .then((guild) => guild.members)
        .then((members) => members.filter((member) => member.online).map((member) => member.username))
        .then((usernames) => usernames.filter((username) => !context.app.minecraftManager.isMinecraftBot(username)))
        .catch(() => [] as string[])

      usernames.push(chunk)
    }

    const resolvedChunks = await Promise.all(usernames)
    return resolvedChunks.flat()
  }
}
