import type Application from '../../../application'
import { InstanceType } from '../../../common/application-event'
import type { GuildFetch, GuildMember } from '../../../core/users/guild-manager'
import Duration from '../../../utility/duration'

export async function autocompleteAllMembers(application: Application): Promise<GuildMember[]> {
  const instances = application.getInstancesNames(InstanceType.Minecraft)
  const tasks: Promise<GuildFetch | undefined>[] = []

  for (const instance of instances) {
    const task = application.core.guildManager.list(instance, Duration.minutes(30)).catch(() => undefined)
    tasks.push(task)
  }

  const result = await Promise.all(tasks)
  return result.filter((guildFetch) => guildFetch !== undefined).flatMap((guildFetch) => guildFetch.members)
}
