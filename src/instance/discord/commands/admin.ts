import { bold, ButtonStyle, escapeMarkdown, SlashCommandBuilder } from 'discord.js'

import type Application from '../../../application'
import { Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandOrigin } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { interactivePaging } from '../utility/discord-pager'
import type { ActionOption, CategoryOption } from '../utility/options-handler.js'
import { OptionsHandler, OptionType } from '../utility/options-handler.js'

export default {
  getCommandBuilder: () => new SlashCommandBuilder().setName('admin').setDescription('Control application settings.'),
  origin: CommandOrigin.Private,
  permission: Permission.ApplicationAdmin,

  handler: async function (context) {
    await context.interaction.deferReply()

    const admin = context.application.core.adminConfigurations
    const options: CategoryOption = {
      type: OptionType.Category,
      name: 'Admin',
      description: 'This is the main admin control-panel. Changing anything here will effect every user globally.',

      options: [
        {
          type: OptionType.EmbedCategory,
          name: 'Custom Profile',
          description: 'Allow all Discord server to customize the Discord bot on their Server.',
          options: [
            {
              type: OptionType.Boolean,
              name: 'Avatar',
              description: 'Allow Discord server admin to customize the Discord bot profile picture.',
              getOption: () => admin.getAllowCustomPicture(),
              toggleOption: () => {
                admin.setAllowCustomPicture(!admin.getAllowCustomPicture())
              }
            },
            {
              type: OptionType.Boolean,
              name: 'Banner',
              description: 'Allow Discord server admin to customize the Discord bot profile banner.',
              getOption: () => admin.getAllowCustomBanner(),
              toggleOption: () => {
                admin.setAllowCustomBanner(!admin.getAllowCustomBanner())
              }
            },
            {
              type: OptionType.Boolean,
              name: 'Bio',
              description: 'Allow Discord server admin to customize the Discord bot bio description.',
              getOption: () => admin.getAllowCustomBio(),
              toggleOption: () => {
                admin.setAllowCustomBio(!admin.getAllowCustomBio())
              }
            }
          ]
        },
        {
          type: OptionType.EmbedCategory,
          name: 'Minecraft Creation',
          description: 'Control new Minecraft instance creation.',
          options: [
            {
              type: OptionType.Boolean,
              name: 'Allow new instances',
              description: 'Whether users can create new Minecraft instances.',
              getOption: () => admin.getAllowCreateMinecraft(),
              toggleOption: () => {
                admin.setAllowCreateMinecraft(!admin.getAllowCreateMinecraft())
              }
            },
            {
              type: OptionType.Boolean,
              name: 'Require Proxy',
              description:
                'Requiring a proxy for each Minecraft instance can reduces the chances of all registered instances getting banned by Hypixel Network. This is Recommended if hosting a large fleet.',
              getOption: () => admin.getRequireProxy(),
              toggleOption: () => {
                admin.setRequireProxy(!admin.getRequireProxy())
              }
            },
            {
              type: OptionType.Number,
              name: 'Max Instances',
              description:
                'How many Minecraft instances are allowed to be created. Note: This will only limit new instances. Existing ones will continue to exist.',
              min: 1,
              max: 9999,
              getOption: () => {
                return admin.getMaxMinecraft()
              },
              setOption: (value) => {
                admin.setMaxMinecraft(Math.floor(value))
              }
            }
          ]
        },
        fetchPluginsOptions(context.application)
      ]
    }

    const optionsHandler = new OptionsHandler(options)
    await optionsHandler.forwardInteraction(context.interaction, context.errorHandler)
  }
} satisfies DiscordCommandHandler

function fetchPluginsOptions(application: Application): ActionOption {
  return {
    type: OptionType.Action,
    name: 'Plugins',
    label: 'Show',
    style: ButtonStyle.Primary,
    onInteraction: async (interaction, errorHandler) => {
      await interaction.deferReply()

      const plugins = application.pluginsManager.getAllInstances()
      await interactivePaging(interaction, 0, Duration.minutes(5).toMilliseconds(), errorHandler, (page) => {
        const EntriesPerPage = 10

        const entries = plugins.slice(page * EntriesPerPage, page * EntriesPerPage + EntriesPerPage)
        const totalPages = Math.ceil(plugins.length / EntriesPerPage)

        let result = ''
        if (entries.length === 0) {
          result = '__Empty List__'
        } else {
          for (const entry of entries) {
            result += `- ${bold(escapeMarkdown(entry.displayName()))}: ${escapeMarkdown(entry.pluginInfo().description)}\n`
          }
        }

        return {
          totalPages: totalPages,
          embed: {
            title: `Installed Plugins (page ${page + 1} out of ${Math.max(totalPages, 1)})`,
            description: result.trim()
          }
        }
      })

      return true
    }
  }
}
