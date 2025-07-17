import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'

export default class Help extends ChatCommandHandler {
  constructor() {
    super({
      triggers: ['help', 'command', 'commands', 'cmd', 'cmds'],
      description: 'Shows a command description and an example about its usage',
      example: `help <command/page>`
    })
  }

  handler(context: ChatCommandContext): string {
    const argument = context.args.length > 0 ? context.args[0] : undefined

    if (argument === undefined) return this.showPage(context, 0)
    if (/^\d+$/g.test(argument)) return this.showPage(context, Number.parseInt(argument, 10))

    const query = argument.toLowerCase()
    const command = context.allCommands.find((c) => c.triggers.includes(query))
    if (command == undefined) return `That command does not exist, use ${context.commandPrefix}${this.triggers[0]}`

    return (
      `${command.triggers[0]}: ${command.description} ` +
      `(${context.commandPrefix}${command.example.replaceAll('%s', context.username)})`
    )
  }

  private showPage(context: ChatCommandContext, page: number): string {
    const pages = this.commandPages(context)

    page = Math.max(Math.min(page, pages.length), 1) //human index

    return `Commands (page ${page} of ${pages.length}): ${pages[page - 1].join(', ')}`
  }

  private commandPages(context: ChatCommandContext): string[][] {
    const allCommands = context.allCommands.map((command) => command.triggers[0])
    const pages: string[][] = []

    const MaxPageLength = 120 // must be below 256 (max character length for minecraft) + some leeway for extra metadata
    let currentPage: string[] = []
    let pageLength = 0
    for (const command of allCommands) {
      if (pageLength >= MaxPageLength) {
        pages.push(currentPage)
        currentPage = []
        pageLength = 0
      }

      currentPage.push(command)
      pageLength += command.length
    }
    if (currentPage.length > 0) pages.push(currentPage)

    return pages
  }
}
