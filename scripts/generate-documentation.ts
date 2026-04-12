import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { markdownTable } from 'markdown-table'

import Application from '../src/application'
import { loadI18 } from '../src/i18next'

await generateCommands()
process.exit(0)

async function generateCommands(): Promise<void> {
  const application = new Application(
    {
      version: 2,
      general: { hypixelApiKey: '', shareMetrics: false },
      discord: { key: '', adminIds: [] },
      prometheus: { enabled: false, port: 0, prefix: '' }
    },
    import.meta.dirname,
    path.resolve(import.meta.dirname, 'config'),
    await loadI18().then((i18n) => i18n.cloneInstance()),
    true
  )

  let featuresPage = ''
  featuresPage += fs.readFileSync('scripts/PERMISSIONS.md', 'utf8').trim()

  featuresPage += '\n\n## Chat Commands\n\n'
  featuresPage += fs.readFileSync('scripts/CHAT-COMMANDS-HEADER.md', 'utf8').trim() + '\n\n'
  featuresPage += generateChatCommands(application)

  featuresPage += `\n\n## Discord Commands\n\n`
  featuresPage += generateDiscordCommands(application)

  featuresPage += `\n\n` + addFooter()

  fs.writeFileSync('docs/COMMANDS.md', featuresPage)
}

function generateChatCommands(application: Application): string {
  const table: string[][] = []
  table.push(['Command', 'Description'])

  // @ts-expect-error private property
  const commands = application.commandsInstance.commands.toSorted((a, b) => a.triggers[0].localeCompare(b.triggers[0]))
  for (const command of commands) {
    table.push([`\`${command.triggers[0]}\``, command.description])
  }

  return markdownTable(table)
}

function generateDiscordCommands(application: Application): string {
  const table: string[][] = []
  table.push(['Command', 'Description'])

  const commands = application.discordInstance.commandsManager.commands
    .values()
    .toArray()
    .map((command) => command.getCommandBuilder())
    .toSorted((a, b) => a.name.localeCompare(b.name))
  for (const command of commands) {
    table.push([`\`/${command.name}\``, command.description])
  }

  return markdownTable(table)
}

function addFooter(): string {
  let text = '---\n\n'
  text += `This document is [auto generated](../scripts/generate-documentation.ts).\n`

  return text
}
