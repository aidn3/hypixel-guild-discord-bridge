import type { PlaceholderContext } from '../common'
import { CanNotResolve, PlaceholderResolver } from '../common'
import { formatString } from '../utility'

export class UsernameResolver extends PlaceholderResolver {
  override keyword(): string {
    return 'USERNAME'
  }

  override description(): string {
    return 'Minecraft username'
  }

  override options(): Record<string, string> {
    return {}
  }

  override resolve(context: PlaceholderContext, options: string[]): string {
    const username = context.user?.mojangProfile()?.name
    if (username === undefined) throw new CanNotResolve()
    return formatString(username, options)
  }
}
