import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { markdownTable } from 'markdown-table'

import Application from '../src/application'
import type { ChatCommandHandler } from '../src/common/commands'
import { ChatCommandGroup } from '../src/common/commands'
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
  featuresPage += fs.readFileSync('scripts/CHAT-COMMANDS-HEADER.md', 'utf8').trim()

  const mentionedCommands = new Set<ChatCommandHandler>()
  featuresPage += '\n\n### General Chat Commands\n\n'
  featuresPage += generateChatCommands(application, mentionedCommands, ChatCommandGroup.General)

  featuresPage += '\n\n### Management Chat Commands\n\n'
  featuresPage += generateChatCommands(application, mentionedCommands, ChatCommandGroup.Management)

  featuresPage += '\n\n### Economy Chat Commands\n\n'
  featuresPage += generateChatCommands(application, mentionedCommands, ChatCommandGroup.Economy)

  featuresPage += `\n\n## Discord Commands\n\n`
  featuresPage += generateDiscordCommands(application)

  featuresPage += `\n\n` + addFooter()

  fs.writeFileSync('docs/COMMANDS.md', featuresPage)
}

function generateChatCommands(
  application: Application,
  mentionedCommands: Set<ChatCommandHandler>,
  group: ChatCommandGroup
): string {
  const table: string[][] = []
  table.push(['Command', 'Description'])

  // @ts-expect-error private property
  const commands = application.commandsInstance.commands
  const prefix = application.commandsInstance.database.commandGroups(group).prefix
  const uniqueCommands = commands.get(group)
  assert.ok(uniqueCommands !== undefined)
  const sortedCommands = uniqueCommands.toSorted((a, b) => a.triggers[0].localeCompare(b.triggers[0]))
  for (const command of sortedCommands) {
    if (mentionedCommands.has(command)) continue
    mentionedCommands.add(command)

    table.push([`\`${prefix}${command.triggers[0]}\``, command.description])
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
