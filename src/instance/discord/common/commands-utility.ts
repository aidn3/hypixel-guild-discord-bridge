import type Application from '../../../application'
import Duration from '../../../utility/duration'
// eslint-disable-next-line import/no-restricted-paths
import type { GuildFetch, GuildMember } from '../../minecraft/guild-manager'

export async function autocompleteAllMembers(application: Application): Promise<GuildMember[]> {
  const instances = application.minecraftManager.getAllInstances()
  const tasks: Promise<GuildFetch | undefined>[] = []

  for (const instance of instances) {
    const task = instance.guildManager.list(Duration.minutes(30)).catch(() => undefined)
    tasks.push(task)
  }

  const result = await Promise.all(tasks)
  return result.filter((guildFetch) => guildFetch !== undefined).flatMap((guildFetch) => guildFetch.members)
}
