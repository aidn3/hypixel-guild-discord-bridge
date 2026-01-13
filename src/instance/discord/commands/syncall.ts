import assert from 'node:assert'

import { SlashCommandBuilder } from 'discord.js'
import PromiseQueue from 'promise-queue'

import type { DiscordCommandHandler } from '../../../common/commands.js'
import Duration from '../../../utility/duration'
import { setIntervalAsync } from '../../../utility/scheduling'
import type { UpdateContext, UpdateProgress } from '../conditions/common'

export default {
  getCommandBuilder: () =>
    new SlashCommandBuilder().setName('syncall').setDescription('synchronize roles and other options for all users'),
  handler: async function (context) {
    const interaction = context.interaction

    assert.ok(interaction.inGuild())
    assert.ok(interaction.inCachedGuild())

    const abortController = new AbortController()
    const singletonTask = new PromiseQueue(1)
    const progress: UpdateProgress = {
      totalGuilds: 0,
      processedGuilds: 0,
      totalUsers: 0,
      processedUsers: 0,
      processedRoles: 0,
      processedNicknames: 0,
      errors: []
    }

    const updateContext = {
      application: context.application,
      guild: interaction.guild,
      updateReason: `Manual sync via /${context.interaction.commandName} by ${interaction.user.username}`,
      abortSignal: abortController.signal,
      startTime: Date.now(),
      progress: progress
    } satisfies UpdateContext

    await interaction.deferReply()

    let lastUpdate = ''
    setIntervalAsync(
      () =>
        singletonTask.add(async () => {
          const currentUpdate = createProgress(progress, 'update')
          if (lastUpdate !== currentUpdate) {
            await interaction.editReply(currentUpdate)
            lastUpdate = currentUpdate
          }
        }),
      {
        errorHandler: context.errorHandler.promiseCatch(`updating progress in /${interaction.commandName}`),
        delay: Duration.seconds(30),
        abortSignal: abortController.signal
      }
    )

    try {
      await context.application.discordInstance.conditionsManager.updateGuild(updateContext, interaction.guild)
      abortController.abort()
      await singletonTask.add(() => interaction.editReply(createProgress(progress, 'done')))
    } catch (error: unknown) {
      abortController.abort()
      context.logger.error(error)
      await singletonTask.add(() => interaction.editReply(createProgress(progress, 'error')))
    }
  }
} satisfies DiscordCommandHandler

function createProgress(progress: UpdateProgress, status: 'done' | 'update' | 'error'): string {
  let result = ''
  switch (status) {
    case 'done': {
      result += '## Updating finished:\n'
      break
    }
    case 'update': {
      result += '## Updating in progress:\n'
      break
    }
    case 'error': {
      result += '## Updating encountered an error:\n'
      break
    }
    default: {
      status satisfies never
    }
  }

  if (progress.totalGuilds >= 2) {
    result += `**Servers processed:** ${progress.processedGuilds}/${progress.totalGuilds}\n`
  }

  // eslint-disable-next-line unicorn/prefer-ternary
  if (progress.totalUsers > 0) {
    result += `**Users processed:** ${progress.processedUsers}/${progress.totalUsers}\n`
  } else {
    result += `**Users processed:** (N/A)`
  }

  result += `**Roles conditions processed:**: ${progress.processedRoles}\n`
  result += `**Nicknames conditions processed:**: ${progress.processedNicknames}\n`

  return result.trim()
}
