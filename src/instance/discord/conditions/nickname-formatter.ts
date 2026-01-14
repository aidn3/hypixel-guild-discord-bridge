import type { NicknameCondition } from '../../../core/discord/user-conditions'

import type { UpdateMemberContext } from './common'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function formatPlaceholder(context: UpdateMemberContext, condition: NicknameCondition): string | undefined {
  // TODO: implement powerful formatter
  return undefined
}
