import type { PlaceholderContext, PlaceholderResolver } from './common'
import { CanNotResolve } from './common'
import { SkyblockLevelResolver } from './resolvers/skyblock-level'
import { UsernameResolver } from './resolvers/username-resolver'

export class PlaceholderManager {
  private readonly resolver = new Map<string, PlaceholderResolver>()

  constructor() {
    this.registerResolver(new UsernameResolver())
    this.registerResolver(new SkyblockLevelResolver())
  }

  public allResolvers(): PlaceholderResolver[] {
    return [...this.resolver.values()]
  }

  public registerResolver(resolver: PlaceholderResolver): void {
    const id = resolver.keyword().toLowerCase()
    if (this.resolver.has(id)) {
      throw new Error(`resolver keyword ${id} already registered`)
    }

    if (!/^[a-z0-9_-]+$/g.test(id)) {
      throw new Error(`resolver keyword ${id} must only contain a-z0-9_- letters`)
    }

    this.resolver.set(id, resolver)
  }

  async resolvePlaceholder(context: PlaceholderContext, query: string): Promise<string> {
    const ExpressionDetector = /{{(.*?)(?<!\\)}}/g

    let match: RegExpMatchArray | null
    const changes = new Map<string, string>()
    while ((match = ExpressionDetector.exec(query)) != undefined) {
      if (changes.has(match[0])) continue

      const expression = match[1]
      const resolvedExpression = await this.resolveExpression(context, expression)
      changes.set(match[0], resolvedExpression)
    }

    for (const [original, replaceWith] of changes.entries()) {
      query = query.replace(original, replaceWith)
    }

    return query
  }

  /*
  async resolveNumber(context: PlaceholderContext, query: string): Promise<number> {}

  async resolveCondition(context: PlaceholderContext, query: string): Promise<boolean> {}
  */

  private async resolveExpression(context: PlaceholderContext, query: string): Promise<string> {
    const parts = query.split('|').map((part) => part.trim())

    for (const part of parts) {
      try {
        return await this.resolveWord(context, part)
      } catch (error: unknown) {
        if (context.throwOnAnyFail || !(error instanceof CanNotResolve)) {
          throw error
        }
      }
    }

    throw new CanNotResolve()
  }

  private async resolveWord(context: PlaceholderContext, query: string): Promise<string> {
    const word = query.trim().toLowerCase()
    if (query.startsWith('"') && word.endsWith('"')) {
      return query.slice(1, -1)
    }

    const parts = word.split(':')
    const id = parts[0]
    const options = parts.slice(1)

    const cachedResult = context.cachedPlaceholders.get(id)
    if (cachedResult !== undefined) return cachedResult

    if (id in context.customPlaceholders) {
      return context.customPlaceholders[id]
    }

    const resolver = this.resolver.get(id)
    if (resolver === undefined) return word

    return resolver.resolve(context, options)
  }
}
