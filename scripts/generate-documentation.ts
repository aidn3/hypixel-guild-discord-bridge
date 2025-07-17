import fs from 'node:fs'
import process from 'node:process'

import { markdownTable } from 'markdown-table'

import { ChatCommandHandler, type DiscordCommandHandler } from '../src/common/commands.js'
import PartyManager from '../src/instance/commands/triggers/party.js'

await generateCommands()
process.exit(0)

async function generateCommands(): Promise<void> {
  let featuresPage = ''
  featuresPage += fs.readFileSync('scripts/PERMISSIONS.md', 'utf8').trim()

  featuresPage += '\n\n## Chat Commands\n\n'
  featuresPage += fs.readFileSync('scripts/CHAT-COMMANDS-HEADER.md', 'utf8').trim() + '\n\n'
  featuresPage += await generateChatCommands()

  featuresPage += `\n\n## Discord Commands\n\n`
  featuresPage += await generateDiscordCommands()

  featuresPage += `\n\n` + addFooter()

  fs.writeFileSync('docs/COMMANDS.md', featuresPage)
}

async function generateChatCommands(): Promise<string> {
  const table: string[][] = []
  table.push(['Command', 'Description'])

  const chatCommandsDirectory = 'src/instance/commands/triggers/'
  const chatCommandPaths = fs.readdirSync(chatCommandsDirectory)
  for (const chatCommandPath of chatCommandPaths) {
    const resolvedPath = '../' + chatCommandsDirectory + chatCommandPath.replaceAll('.ts', '.js')
    const importedModule = (await import(resolvedPath)) as unknown as { default: ChatCommandHandler | PartyManager }
    const module = importedModule.default
    // @ts-expect-error it is an extended ChatCommandHandler with filled constructors
    const loadedModule = new module() as unknown as ChatCommandHandler | PartyManager
    if (loadedModule instanceof ChatCommandHandler) {
      table.push([`\`${loadedModule.triggers[0]}\``, loadedModule.description])
    } else if (loadedModule instanceof PartyManager) {
      for (const resolvedCommand of loadedModule.resolveCommands()) {
        table.push([`\`${resolvedCommand.triggers[0]}\``, resolvedCommand.description])
      }
    } else {
      throw new TypeError(`Unrecognized module with path: ${resolvedPath}`)
    }
  }

  return markdownTable(table)
}

async function generateDiscordCommands(): Promise<string> {
  const table: string[][] = []
  table.push(['Command', 'Description'])

  const chatCommandsDirectory = 'src/instance/discord/commands/'
  const chatCommandPaths = fs.readdirSync(chatCommandsDirectory)
  for (const chatCommandPath of chatCommandPaths) {
    const resolvedPath = '../' + chatCommandsDirectory + chatCommandPath.replaceAll('.ts', '.js')
    const importedModule = (await import(resolvedPath)) as unknown as { default: DiscordCommandHandler }
    const module = importedModule.default

    const builder = module.getCommandBuilder()

    table.push([`\`/${builder.name}\``, builder.description])
  }

  return markdownTable(table)
}

function addFooter(): string {
  let text = '---\n\n'
  text += `This document is [auto generated](../scripts/generate-documentation.ts).\n`

  return text
}
