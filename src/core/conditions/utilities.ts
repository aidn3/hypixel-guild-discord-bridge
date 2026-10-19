import assert from 'node:assert'

import type { TFunction } from 'i18next'

import type { MojangProfile } from '../../common/user.js'
import type { SkyblockMember } from '../hypixel/hypixel-skyblock.js'
import type { Hypixel } from '../hypixel/hypixel.js'

import type {
  ConditionFailureResult,
  ConditionValue,
  HandlerOperationContext,
  SkyblockProfileOptionType
} from './common.js'
import { ConditionResultType } from './common.js'

export async function getSkyblockUserProfiles(
  context: HandlerOperationContext,
  hypixel: Hypixel,
  mojangProfile: MojangProfile,
  allowedProfiles: SkyblockProfileOptionType['profileTypes']
): Promise<SkyblockMember[]> {
  const uuid = mojangProfile.id
  const profiles = await hypixel.getSkyblockProfiles(uuid, context.startTime)
  if (profiles === undefined) return []

  const result = []
  for (const profile of profiles) {
    const profileType = profile.game_mode ?? 'classic'
    if (allowedProfiles.includes(profileType)) {
      result.push(profile.members[mojangProfile.id])
    }
  }

  return result
}

export function formatPrimitiveValue(t: TFunction, value: ConditionValue): string {
  if (typeof value === 'string') return value
  else if (typeof value === 'boolean') {
    if (value) return t(($) => $['conditions.format.true'])
    return t(($) => $['conditions.format.false'])
  } else if (typeof value === 'number') {
    return t(($) => $['conditions.format.number'], { value })
  } else {
    value satisfies never
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    assert.fail(`Unknown value type: ${value}`)
  }
}

export function noHypixelKey(t: TFunction): { meetsCondition: ConditionFailureResult; createCondition: string } {
  return {
    createCondition: t(($) => $['conditions.error.no-hypixel-api-key']),
    meetsCondition: {
      type: ConditionResultType.Error,
      reason: t(($) => $['conditions.error.no-hypixel-api-key'])
    }
  }
}
