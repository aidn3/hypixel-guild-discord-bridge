import { roleMention, userMention } from 'discord.js'

import type Application from '../../../application'
import { Permission } from '../../../common/application-event'

export function translateNoPermission(
  application: Application,
  requiredPermission: Exclude<Permission, Permission.Anyone>
): string {
  const roles: string[] = []
  const admins = application.discordInstance.getStaticConfig().adminIds

  switch (requiredPermission) {
    case Permission.Helper: {
      roles.push(
        ...application.core.discordConfigurations.getHelperRoleIds(),
        ...application.core.discordConfigurations.getOfficerRoleIds()
      )
      break
    }
    case Permission.Officer: {
      roles.push(...application.core.discordConfigurations.getOfficerRoleIds())
      break
    }
  }

  let result: string
  if (roles.length === 0 && admins.length === 0) {
    result = application.i18n.t(($) => $['discord.message.no-permission'])
  } else if (roles.length > 0 && admins.length === 0) {
    result = application.i18n.t(($) => $['discord.message.no-permission-roles'], {
      roles: roles.map((roleId) => roleMention(roleId))
    })
  } else if (roles.length === 0 && admins.length > 0) {
    result = application.i18n.t(($) => $['discord.message.no-permission-admin'], {
      admins: admins.map((adminId) => userMention(adminId))
    })
  } else {
    result = application.i18n.t(($) => $['discord.message.no-permission-roles-admin'], {
      roles: roles.map((roleId) => roleMention(roleId)),
      admins: admins.map((adminId) => userMention(adminId))
    })
  }

  return result
}
