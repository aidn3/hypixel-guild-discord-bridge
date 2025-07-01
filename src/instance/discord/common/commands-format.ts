import type { APIEmbed } from 'discord.js'
import { escapeMarkdown } from 'discord.js'

import { Color } from '../../../common/application-event.js'

import { DefaultCommandFooter } from './discord-config.js'

export function formatInvalidUsername(givenUsername: string): APIEmbed {
  return {
    title: 'Could not find the username',
    color: Color.Bad,
    description: `Can't resolve username \`${escapeMarkdown(givenUsername)}\`.\n` + 'Make sure of username spelling.',
    fields: [
      {
        name: 'How usernames are written?',
        value:
          'Usernames are made out of 2-16 letter and can only have:\n' +
          '- alphabet letters (A-Z)\n' +
          '- numbers (0-9)\n' +
          "- underscore '_'"
      },
      {
        name: "I'm sure the username is valid!",
        value:
          'It could be Mojang fault for not resolving it (e.g. their servers are down).\n' +
          'If problem persists, contact an admin for support'
      }
    ],
    footer: { text: DefaultCommandFooter }
  }
}
