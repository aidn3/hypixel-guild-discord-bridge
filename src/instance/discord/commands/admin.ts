import { SlashCommandBuilder } from 'discord.js'

import { Permission } from '../../../common/application-event.js'
import type { DiscordCommandHandler } from '../../../common/commands.js'
import { CommandOrigin } from '../../../common/commands.js'
import type { CategoryOption } from '../utility/options-handler.js'
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
        }
      ]
    }

    const optionsHandler = new OptionsHandler(options)
    await optionsHandler.forwardInteraction(context.interaction, context.errorHandler)
  }
} satisfies DiscordCommandHandler
