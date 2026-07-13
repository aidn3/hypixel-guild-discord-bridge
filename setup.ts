/* eslint-disable no-restricted-syntax */
import fs from 'node:fs'
import path from 'node:path'
import type { Interface } from 'node:readline/promises'
import { createInterface } from 'node:readline/promises'

import { DiscordAPIError, REST, Routes } from 'discord.js'
import Yaml from 'yaml'

import type { ApplicationConfig } from './src/application-config'

try {
  await startCreateConfigurations()
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.error()
    console.error(error.message)
    process.exit(1)
  }
}

process.exit(0)

async function startCreateConfigurations(): Promise<void> {
  const rootDirectory = import.meta.dirname

  const configurationsPath = path.join(rootDirectory, 'config.yaml')
  const configurations = getExistingConfigurations(configurationsPath)

  const examplePath = path.join(rootDirectory, 'config_example.yaml')
  const exampleRaw = fs.readFileSync(examplePath, 'utf8')
  const example = Yaml.parse(exampleRaw) as ApplicationConfig

  const newConfigurations = await createConfig(example, configurations ?? {})

  const newPath = path.join(rootDirectory, 'config.yaml')
  const newRaw = Yaml.stringify(newConfigurations)

  await displayImportantInformation(newConfigurations)

  console.log('Writing new configurations:', newPath)
  fs.writeFileSync(newPath, newRaw)
}

async function displayImportantInformation(config: ApplicationConfig): Promise<void> {
  const result = (await new REST().setToken(config.discord.key).get(Routes.currentApplication())) as {
    id: string
  }
  const discordBotJoin = `https://discord.com/oauth2/authorize?client_id=${result.id}&permissions=8&integration_type=0&scope=bot`
  console.log(`> Invite the Discord bot to you server using this link: ${discordBotJoin}`)
}

async function createConfig(
  example: ApplicationConfig,
  initial: DeepPartial<ApplicationConfig>
): Promise<ApplicationConfig> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout })

  const discordKey = await getDiscordKey(terminal, getString(initial.discord?.key))
  terminal.write('\n')
  const discordUsers = await getDiscordUsers(terminal, getStringArray(initial.discord?.adminIds) ?? [])
  terminal.write('\n')
  const hypixelKey = await getHypixelKey(terminal, getString(initial.general?.hypixelApiKey))
  terminal.write('\n')
  const shareMetrics = await getShareMetrics(
    terminal,
    getBoolean(initial.general?.shareMetrics) ?? example.general.shareMetrics
  )
  terminal.write('\n')

  terminal.close()

  return {
    version: 2,
    general: {
      hypixelApiKey: hypixelKey,
      urchinApiKey: getString(initial.general?.urchinApiKey) ?? example.general.urchinApiKey,
      shareMetrics: shareMetrics
    },
    discord: { key: discordKey, adminIds: discordUsers },
    prometheus: {
      prefix: getString(initial.prometheus?.prefix) ?? example.prometheus.prefix,
      port: getNumber(initial.prometheus?.port) ?? example.prometheus.port,
      enabled: getBoolean(initial.prometheus?.enabled) ?? example.prometheus.enabled
    }
  }
}

async function getHypixelKey(terminal: Interface, defaultKey: string | undefined): Promise<string> {
  terminal.write('============================================\n')
  terminal.write('> Hypixel API key\n')
  terminal.write('> Hypixel API key is required to synchronize guild members stats across platform.\n')
  terminal.write('> You can create one from this link: https://developer.hypixel.net\n')

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    let key = await (defaultKey === undefined
      ? terminal.question('Hypixel API key: ').then((response) => response.trim())
      : terminal.question('Hypixel API key (press ENTER to keep the default): ').then((response) => response.trim()))

    if (key.length === 0 && defaultKey !== undefined) key = defaultKey

    // UUID v4
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(key)) {
      terminal.write('Hypixel API key is required.\n')
      continue
    }

    const valid = await fetch('https://api.hypixel.net/v2/punishmentstats', { headers: [['API-Key', key]] })
    if (valid.status === 200 || valid.status === 429) {
      return key
    }

    if (valid.status === 403) {
      terminal.write('Invalid Hypixel API key.\n')
    } else {
      terminal.write('Can not verify Hypixel API key validity. Try again later.\n')
    }
  }
}

async function getDiscordKey(terminal: Interface, defaultKey: string | undefined): Promise<string> {
  terminal.write('============================================\n')
  terminal.write('> Discord Bot key\n')
  terminal.write('> Discord bot is required to synchronize guild members chat with the Discord server.\n')
  terminal.write('> You can create one from this link: https://discord.com/developers/applications\n')
  terminal.write('> For full guidance: https://discordjs.guide/legacy/preparations/app-setup\n')

  const rest = new REST()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    let token = await (defaultKey === undefined
      ? terminal.question('Discord bot key: ').then((response) => response.trim())
      : terminal.question('Discord bot key (press ENTER to keep the default): ').then((response) => response.trim()))

    if (token.length === 0 && defaultKey !== undefined) token = defaultKey

    // regex credit: https://github.com/odomojuli/regextokens/blob/1c80404e0bda64485fd2d14568f7b211e404c33c/regextokens/data/patterns.json#L608
    if (!/^[MNO][0-9A-Za-z_-]{23,25}\.[0-9A-Za-z_-]{6}\.[0-9A-Za-z_-]{27,38}$/.test(token)) {
      terminal.write('Invalid Discord bot key.\n')
      continue
    }

    try {
      rest.setToken(token)
      const response = (await rest.get(Routes.currentApplication())) as { name: string }
      terminal.write(`Discord Bot: ${response.name}\n`)
      return token
    } catch (error: unknown) {
      if (error instanceof DiscordAPIError && error.status === 401) {
        terminal.write('Invalid Discord API key.\n')
      } else {
        terminal.write('Can not verify the validity of Discord bot key. Try again later.\n')
      }
    }
  }
}

async function getDiscordUsers(terminal: Interface, defaultUsers: string[]): Promise<string[]> {
  terminal.write('============================================\n')
  terminal.write('> Discord Admin Users\n')
  terminal.write('> Input your own user id to grant administrative permission over the newly created Discord bot.\n')
  terminal.write('> This person will have full control over the entire application.\n')
  terminal.write('> You can provide additional user ids for other people you really trust.\n')

  if (defaultUsers.length > 0) {
    terminal.write(`Default users: ${defaultUsers.join(', ')}\n`)
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const result = await terminal
      .question('Discord users [user id separated by a comma, press ENTER to keep default users]: ')
      .then((response) => response.trim())

    if (result.length === 0) {
      if (defaultUsers.length > 0) return defaultUsers
      terminal.write('Must provide at least one valid user id.')
      continue
    }
    const users = result
      .split(',')
      .map((user) => user.trim())
      .filter((user) => user.length > 0)

    if (users.length === 0) {
      terminal.write('Must provide at least one valid user id.')
      continue
    }

    let invalidUser = false
    for (const [index, user] of users.entries()) {
      if (!/^\d+$/.test(user)) {
        terminal.write(`User ${index + 1} is invalid. Given: ${user}\n`)
        invalidUser = true
        break
      }
    }
    if (invalidUser) continue

    // unique users
    return users.filter((value, index, array) => array.indexOf(value) === index)
  }
}

async function getShareMetrics(terminal: Interface, defaultKey: boolean): Promise<boolean> {
  terminal.write('============================================\n')
  terminal.write('> Share Anonymous Metrics\n')
  terminal.write('> Share basic anonymous metrics\n')
  terminal.write('> to display on the project main page as a way to show its popularity.\n')
  terminal.write('> All metrics are anonymous and are limited to counting and never about anything specific.\n')
  terminal.write('> https://github.com/aidn3/hypixel-guild-discord-bridge/blob/master/docs/PRIVACY.md\n')

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const result = defaultKey
      ? await terminal.question('Share metrics [YES (default) / NO]: ').then((response) => response.trim())
      : await terminal.question('Share metrics [YES / NO (default)]: ').then((response) => response.trim())

    if (/^YES|Y$/i.test(result)) {
      return true
    } else if (/^NO|N$/.test(result)) {
      return false
    } else if (result.length === 0) {
      return defaultKey
    }

    terminal.write('Invalid input.\n')
  }
}

function getExistingConfigurations(path: fs.PathLike): ApplicationConfig | undefined {
  if (!fs.existsSync(path)) return undefined
  const d = fs.readFileSync(path, 'utf8')
  return Yaml.parse(d) as ApplicationConfig
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function getStringArray(array: unknown): string[] | undefined {
  if (!Array.isArray(array)) return undefined

  const result: string[] = []
  for (const entry of array as unknown[]) {
    if (typeof entry === 'string') result.push(entry)
    if (typeof entry === 'number') result.push(entry.toString(10))
  }
  return result
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}
