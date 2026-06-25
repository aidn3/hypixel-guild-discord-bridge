import assert from 'node:assert'

import nbt from 'prismarine-nbt'

import type { Hypixel } from '../../../core/hypixel/hypixel'
import type { SkyblockMember } from '../../../core/hypixel/hypixel-skyblock'
import type { MojangApi } from '../../../core/users/mojang'

import type { ChatCommandContext } from 'src/common/commands'

export async function getUuidIfExists(mojangApi: MojangApi, username: string): Promise<string | undefined> {
  return await mojangApi
    .profileByUsername(username)
    .then((mojangProfile) => mojangProfile.id)
    .catch(() => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      return undefined
    })
}

export async function getSelectedSkyblockProfile(
  hypixelApi: Hypixel,
  uuid: string
): Promise<SkyblockMember | undefined> {
  const profiles = await hypixelApi.getSkyblockProfiles(uuid)

  if (!profiles) return undefined
  const profile = profiles.find((p) => p.selected) ?? profiles.at(0)

  const selected = profile?.members[uuid]
  assert.ok(selected)
  return selected
}

export async function parseEncodedNbt<T>(base64: string): Promise<T> {
  const decoded = Buffer.from(base64, 'base64')
  const parsed = await nbt.parse(decoded)
  return nbt.simplify(parsed.parsed) as T
}

export function usernameNotExists(context: ChatCommandContext, givenUsername: string): string {
  return context.app.i18n.t(($) => $['commands.error.username-not-exists'], { username: givenUsername })
}

export function canOnlyUseIngame(context: ChatCommandContext): string {
  return context.app.i18n.t(($) => $['commands.error.must-be-ingame'], { username: context.username })
}

export function playerNeverPlayedHypixel(context: ChatCommandContext, username: string): string {
  return context.app.i18n.t(($) => $['commands.error.never-joined-hypixel'], { username: username })
}

export function playerNeverPlayedSkyblock(context: ChatCommandContext, username: string): string {
  return context.app.i18n.t(($) => $['commands.error.never-joined-skyblock'], { username: username })
}

export function playerNeverPlayedDungeons(username: string): string {
  return `${username} has never played dungeons before?`
}

export function playerNeverPlayedSlayers(username: string): string {
  return `${username} has never done slayers before?`
}

export function playerNeverEnteredCrimson(username: string): string {
  return `${username} has never entered Crimson Isle before?`
}
