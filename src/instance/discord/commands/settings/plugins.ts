import assert from 'node:assert'

import type { APISelectMenuOption } from 'discord.js'
import { ActionRowBuilder, escapeMarkdown, StringSelectMenuBuilder } from 'discord.js'

import type Application from '../../../../application.js'
import { Color, InstanceType } from '../../../../common/application-event.js'
import type { DiscordCommandContext } from '../../../../common/commands.js'
import type { PluginConfig } from '../../../features/common/plugins-config.js'
import { DefaultCommandFooter } from '../../common/discord-config.js'

const PluginsSelection = 'toggle'

export async function handlePluginsInteraction(context: DiscordCommandContext): Promise<void> {
  switch (context.interaction.options.getSubcommand()) {
    case PluginsSelection: {
      await handlePluginsToggle(context)
      break
    }
  }
}

export async function handlePluginsToggle(context: DiscordCommandContext): Promise<void> {
  const config = context.application.pluginsManager.getConfig()

  const reply = await context.interaction.reply({
    embeds: [{ description: 'Select Features to enable.', footer: { text: DefaultCommandFooter } }],
    // @ts-expect-error not all members are needed by the discord api
    components: [new ActionRowBuilder().addComponents(generateEnabledPlugins(context.application, config.data))]
  })

  reply
    .createMessageComponentCollector({
      time: 120_000,
      filter: (interaction) => interaction.user.id === context.interaction.user.id
    })
    .on('collect', (interaction) => {
      if (interaction.customId !== PluginsSelection) return
      assert(interaction.isStringSelectMenu())
      const conflicts = context.application.pluginsManager.checkConflicts(interaction.values)
      if (conflicts.length > 0) {
        void interaction
          .update({
            embeds: [
              {
                title: 'Select Features to enable.',
                description:
                  '__**Features Incompatibilities:**__\n\n' +
                  conflicts
                    .map(
                      (conflict) =>
                        `- \`${escapeMarkdown(conflict.pluginName)}\` is incompatible with \`${escapeMarkdown(conflict.incompatibleWith)}\``
                    )
                    .join('\n'),
                color: Color.Bad,
                footer: { text: DefaultCommandFooter }
              }
            ]
          })
          .catch(context.errorHandler.promiseCatch('showing plugin selection conflict message'))
        return
      }

      config.data.enabledPlugins = interaction.values
      config.save()
      void interaction
        .update({
          embeds: [
            {
              title: 'Select Features to enable.',
              description: 'Features have been set.',
              color: Color.Good,
              footer: { text: DefaultCommandFooter }
            }
          ],
          // @ts-expect-error not all members are needed by the discord api
          components: [new ActionRowBuilder().addComponents(generateEnabledPlugins(context.application, config.data))]
        })
        .catch(context.errorHandler.promiseCatch('selecting plugins'))
    })
    .on('end', () => {
      void reply.edit({ components: [] }).catch(context.errorHandler.promiseCatch('removing action row'))
    })
}

function generateEnabledPlugins(application: Application, config: PluginConfig) {
  const localPlugins = application.pluginsManager.getAllInstances()
  const options: APISelectMenuOption[] = []

  // add metadata from local plugins + include all other plugins with basic data
  options.push(
    ...localPlugins.map((plugin) => ({
      label: plugin.instanceName,
      value: plugin.instanceName,
      description: plugin.pluginInfo().description,
      default: config.enabledPlugins.includes(plugin.instanceName)
    })),
    ...application
      .getAllInstancesIdentifiers()
      .filter((instance) => instance.instanceType === InstanceType.Plugin)
      .filter((plugin) => !localPlugins.some((localPlugin) => localPlugin.instanceName === plugin.instanceName))
      .map((plugin) => ({
        label: plugin.instanceName,
        value: plugin.instanceName,
        description: 'Unknown plugin. Do NOT toggle unless you know what you are doing!',
        default: config.enabledPlugins.includes(plugin.instanceName)
      }))
  )

  return new StringSelectMenuBuilder()
    .setCustomId(PluginsSelection)
    .setMinValues(0)
    .setMaxValues(options.length)
    .addOptions(options)
}
