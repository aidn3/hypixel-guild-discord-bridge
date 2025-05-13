import assert from 'node:assert'

import { type APIEmbed, type APIEmbedField, escapeMarkdown, italic } from 'discord.js'

import type { ApplicationEvents } from '../../../../common/application-event.js'
import { Color, InstanceType } from '../../../../common/application-event.js'
import type { DiscordCommandContext } from '../../../../common/commands.js'
import { Timeout } from '../../../../util/timeout.js'
// eslint-disable-next-line import/no-restricted-paths
import type { ProxyConfig } from '../../../minecraft/common/config.js'
// eslint-disable-next-line import/no-restricted-paths
import { ProxyProtocol } from '../../../minecraft/common/config.js'
import { DefaultCommandFooter } from '../../common/discord-config.js'

export const MinecraftSetAdmin = 'set-admin'
export const MinecraftAdd = 'add'
export const MinecraftRemove = 'remove'
export const MinecraftStatus = 'status'

type ApplicationListeners<T> = { [P in keyof T]?: T[P] }

export async function handleMinecraftInteraction(context: DiscordCommandContext): Promise<void> {
  switch (context.interaction.options.getSubcommand()) {
    case MinecraftSetAdmin: {
      await handleSetAdmin(context)
      break
    }
    case MinecraftStatus: {
      await handleStatus(context)
      break
    }
    case MinecraftAdd: {
      await handleAddInstance(context)
      break
    }
    case MinecraftRemove: {
      await handleRemoveInstance(context)
      break
    }
  }
}

async function handleSetAdmin(context: DiscordCommandContext): Promise<void> {
  const config = context.application.minecraftManager.getConfig()
  const username = context.interaction.options.getString('username', true)
  let description: string
  if (config.data.adminUsername === username) {
    description = `\`${username}\` is already set as the admin.`
  } else {
    description = `\`${username}\` has been set as the admin.`
    config.data.adminUsername = username
    config.save()
  }

  await context.interaction.reply({
    embeds: [{ title: 'Set Minecraft Admin', description: description }]
  })
}

async function handleStatus(context: DiscordCommandContext): Promise<void> {
  const config = context.application.minecraftManager.getConfig().data
  const instances = context.application.minecraftManager.getAllInstances()

  const embed: APIEmbed = {
    title: 'Minecraft Status',
    fields: [],
    footer: {
      text: DefaultCommandFooter
    }
  }
  assert(embed.fields)

  embed.fields.push({
    name: 'admin username',
    value: config.adminUsername
  } satisfies APIEmbedField)

  const registeredInstances = instances.filter((instance) =>
    config.instances.some((configInstance) => instance.instanceName === configInstance.name)
  )
  embed.fields.push({
    name: 'Registered Instances',
    value:
      registeredInstances.length > 0
        ? registeredInstances
            .map((instance) => `- **${instance.instanceName}:** ${instance.currentStatus()}`)
            .join('\n')
        : '(none registered)'
  } satisfies APIEmbedField)

  const dynamicInstances = instances.filter(
    (instance) => !config.instances.some((configInstance) => instance.instanceName === configInstance.name)
  )
  if (dynamicInstances.length > 0) {
    embed.fields.push({
      name: 'Dynamic Instances',
      value: dynamicInstances
        .map((instance) => `- **${instance.instanceName}:** ${instance.currentStatus()}`)
        .join('\n')
    } satisfies APIEmbedField)
  }

  const unavailableInstances = config.instances
    .map((instance) => instance.name)
    .filter((configName) => !instances.some((instance) => instance.instanceName === configName))
  if (unavailableInstances.length > 0) {
    embed.color = Color.Bad
    embed.description =
      '_Unavailable minecraft instances detected in settings._\n' +
      '_Those instances are registered in settings but not loaded into application._\n' +
      '_This should not happen. Restart the application and check console logs for the reason for this behaviour._'

    embed.fields.push({
      name: 'Unavailable Instances',
      value: unavailableInstances.map((name) => `- ${name}`).join('\n')
    } satisfies APIEmbedField)
  }

  await context.interaction.reply({
    embeds: [embed]
  })
}

async function handleAddInstance(context: DiscordCommandContext): Promise<void> {
  const EmbedTitle = 'Adding new minecraft instance'
  const InitiationTimeout = 30 * 60 * 1000

  const instanceName = context.interaction.options.getString('name', true)
  const proxyOptions = context.interaction.options.getString('proxy')
  let proxy: ProxyConfig | undefined = undefined
  if (proxyOptions !== null) {
    try {
      proxy = parseSocks5(proxyOptions)
    } catch (error: unknown) {
      context.logger.error(error)

      await context.interaction.reply({
        embeds: [
          {
            title: EmbedTitle,
            description: errorMessage(error),
            color: Color.Error,
            footer: {
              text: DefaultCommandFooter
            }
          } satisfies APIEmbed
        ]
      })
      return
    }
  }

  const embed: APIEmbed = {
    title: EmbedTitle,
    description: '**Progress:**\n'
  }
  assert(embed.description)

  let sendChainPromise: Promise<unknown> = context.interaction.deferReply()
  const updateEmbed = () => {
    return context.interaction
      .editReply({
        embeds: [embed]
      })
      .catch(context.errorHandler.promiseCatch('updating adding minecraft instance progress'))
  }

  const refresher = setTimeout(() => {
    sendChainPromise = sendChainPromise.then(updateEmbed)
  }, 1000)

  const registeredEvents: ApplicationListeners<ApplicationEvents> = {}
  const sleepTimeout = new Timeout<true>(InitiationTimeout)

  registeredEvents.instanceStatus = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- ${event.message}\n`
    refresher.refresh()
  }
  registeredEvents.instanceSignal = (event) => {
    if (!event.targetInstanceName.includes(instanceName)) return

    assert(embed.description)
    embed.description += `- ${event.type} signal has been received received\n`
    refresher.refresh()
  }
  registeredEvents.instanceAnnouncement = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- Instance has been created\n`
    refresher.refresh()
  }
  registeredEvents.instanceMessage = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- ${event.message}\n`
    refresher.refresh()
  }
  registeredEvents.minecraftSelfBroadcast = (event) => {
    if (event.instanceName !== instanceName || event.instanceType !== InstanceType.Minecraft) return

    assert(embed.description)
    embed.description += `- Instance has logged in as ${event.username} (${event.uuid})\n`
    embed.color = Color.Good

    sleepTimeout.resolve(true)
  }

  for (const [name, listener] of Object.entries(registeredEvents)) {
    context.application.on(name as keyof ApplicationEvents, listener)
  }
  try {
    embed.description += `- Creating a fresh Minecraft instance\n`
    context.application.minecraftManager.addAndStart({ name: instanceName, proxy: proxy })

    const config = context.application.minecraftManager.getConfig()
    config.data.instances.push({
      name: instanceName,
      proxy: proxy
    })
    config.save()
    embed.description += `- Instance has been added to settings for future reboot\n`
  } catch (error: unknown) {
    embed.description += `- ERROR: Failed to add minecraft instance. ${errorMessage(error)}\n`
    embed.color = Color.Error
    sleepTimeout.resolve(true)
  }
  await sleepTimeout.wait()

  for (const [name, listener] of Object.entries(registeredEvents)) {
    context.application.removeListener(name as keyof ApplicationEvents, listener)
  }
  clearTimeout(refresher)
  await sendChainPromise.then(updateEmbed)
}

async function handleRemoveInstance(context: DiscordCommandContext): Promise<void> {
  const instanceName = context.interaction.options.getString('name', true)
  await context.interaction.deferReply()

  const embed = {
    title: 'Remove Minecraft',
    description: `Removing minecraft \`${escapeMarkdown(instanceName)}\`\n\n`,
    color: Color.Default,
    footer: { text: DefaultCommandFooter }
  } satisfies APIEmbed

  try {
    const results = await context.application.minecraftManager.removeInstance(instanceName)
    embed.color = Color.Good

    if (results.instanceRemoved === 0) {
      embed.description += '- No active instance to be removed.'
    } else if (results.instanceRemoved === 1) {
      embed.description += '- Active instance has been successfully removed.'
    } else {
      embed.description += `- More than one instance have been detected and removed (total: \`${results.instanceRemoved}\`)\`.`
      embed.color = Color.Info
    }
    embed.description += '\n'

    if (results.deletedConfig === 0) {
      embed.description += '- No relevant configuration has been detected to try and delete.'
    } else if (results.deletedConfig === 1) {
      embed.description += '- Relevant configuration has been detected and deleted.'
    } else {
      embed.description += `- More than one configuration has been detected and removed (total: \`${results.deletedConfig}\`)\`.`
      embed.color = Color.Info
    }
    embed.description += '\n'

    if (results.deletedSessionFiles > 0) {
      embed.description += '- Session files have been detected and deleted.'
    }
  } catch (error: unknown) {
    context.logger.error(error)
    embed.color = Color.Error
    embed.description += italic(
      'An error occurred while trying to remove Minecraft instance\n' +
        'The results are inconclusive.\n' +
        'Check the console logs for further  details\n' +
        'Tread carefully when trying anything else.'
    )
  }

  await context.interaction.editReply({ embeds: [embed] })
}

function parseSocks5(url: string): ProxyConfig {
  /*
  Notice: Regex does not detect escape characters.
  Tested regex:
    socks5://username:password@server.com:1080
    socks5://username:password@server.com
    socks5://username@server.com:1080
    socks5://server.com
    socks5://server.com:1080
   */
  const regex = /^(?<type>socks5):\/\/(?:(?<username>\w+):(?<password>[^@]+)@)?(?<host>[^:]+)(?::(?<port>\d+))?$/gm
  const match = regex.exec(url)

  if (match === null)
    throw new Error('Invalid proxy format. e.g. valid proxy: socks5://username:password@server.com:1080')

  const groups = match.groups as {
    type: ProxyProtocol
    username: string | undefined
    password: string | undefined
    host: string
    port: string | undefined
  }
  assert(match.groups)

  const type = groups.type
  //const username: string | undefined = groups.username
  //const password: string | undefined = groups.password
  const host: string = groups.host
  const port: number = groups.port === undefined ? 1080 : Number.parseInt(groups.port)

  if (type.toLowerCase() !== ProxyProtocol.Socks5.toLowerCase()) {
    throw new Error('invalid proxy type. Only "socks5" is supported.')
  }

  return { host: host, port: port, protocol: type } satisfies ProxyConfig
}

function errorMessage(error: unknown): string {
  if (error === undefined || error === null) return `${error}`

  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return JSON.stringify(error)
}
