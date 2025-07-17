import type { UserIdentifier } from '../../common/application-event.js'

export function matchUserIdentifier(userIdentifier: UserIdentifier, identifiers: string[]): boolean {
  return matchIdentifiersLists(userIdentifiersToList(userIdentifier), identifiers)
}

export function matchIdentifiersLists(identifiers: string[], compareTo: string[]): boolean {
  for (const identifier of identifiers) {
    for (const compareIdentifier of compareTo) {
      if (identifier.toLowerCase() === compareIdentifier.toLowerCase()) return true
    }
  }
  return false
}

export function userIdentifiersToList(userIdentifier: UserIdentifier): string[] {
  return [userIdentifier.userName, userIdentifier.userUuid, userIdentifier.userDiscordId].filter(
    (identifier) => identifier !== undefined
  )
}
