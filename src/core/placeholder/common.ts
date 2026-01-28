import type Application from '../../application'
import type { User } from '../../common/user'

export interface PlaceholderContext {
  application: Application
  user: User | undefined
  startTime: number
  throwOnAnyFail: boolean
  customPlaceholders: Record<string, string>
  cachedPlaceholders: Map<string, string>
}

export class CanNotResolve extends Error {}

export abstract class PlaceholderResolver {
  /**
   * Keyword must only contain A-Z and a-z and 0-9 and "_" and "-"
   */
  public abstract keyword(): string

  public abstract options(): Record<string, string>

  public abstract description(): string

  /**
   * Resolve the data based on the {@link context}
   * @param context context of the environment and data associated with current situation
   * @param options any existing option added on top of the keyword
   */
  public abstract resolve(context: PlaceholderContext, options: string[]): Promise<string> | string
}
