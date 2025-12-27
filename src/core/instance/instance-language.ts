import type { i18n } from 'i18next'

import type { StatusChange } from '../../common/application-event'
import { InstanceMessageType } from '../../common/application-event'
import { Status } from '../../common/connectable-instance'

export function translateInstanceMessage(i18n: i18n, key: InstanceMessageType): string {
  switch (key) {
    case InstanceMessageType.MinecraftAuthenticationCode: {
      return i18n.t(($) => $['instance.message.authentication-code'])
    }
    case InstanceMessageType.MinecraftInstanceNotAutoConnect: {
      return i18n.t(($) => $['instance.message.no-autoconnect'])
    }
    case InstanceMessageType.MinecraftKicked: {
      return i18n.t(($) => $['instance.message.minecraft-kicked'])
    }
    case InstanceMessageType.MinecraftBanned: {
      return i18n.t(($) => $['instance.message.minecraft-banned'])
    }
    case InstanceMessageType.MinecraftInternetProblems: {
      return i18n.t(($) => $['instance.message.internet-problems'])
    }
    case InstanceMessageType.MinecraftFailedTooManyTimes: {
      return i18n.t(($) => $['instance.message.failed-too-many-times'])
    }
    case InstanceMessageType.MinecraftEnded: {
      return i18n.t(($) => $['instance.message.minecraft-ended'])
    }
    case InstanceMessageType.MinecraftIncompatible: {
      return i18n.t(($) => $['instance.message.version-incompatible'])
    }
    case InstanceMessageType.MinecraftKickedLoggedFromAnotherLocation: {
      return i18n.t(($) => $['instance.message.logged-from-another-location'])
    }
    case InstanceMessageType.MinecraftXboxDown: {
      return i18n.t(($) => $['instance.message.xbox-down'])
    }
    case InstanceMessageType.MinecraftXboxThrottled: {
      return i18n.t(($) => $['instance.message.xbox-throttled'])
    }
    case InstanceMessageType.MinecraftNoAccount: {
      return i18n.t(($) => $['instance.message.no-account'])
    }
    case InstanceMessageType.MinecraftProxyBroken: {
      return i18n.t(($) => $['instance.message.proxy-problem'])
    }
    case InstanceMessageType.MinecraftRestarting: {
      return i18n.t(($) => $['instance.message.restarting'])
    }
    case InstanceMessageType.MinecraftGuildKicked: {
      return i18n.t(($) => $['instance.message.guild-kicked'])
    }
    case InstanceMessageType.MinecraftConnectionTerminated: {
      return i18n.t(($) => $['instance.message.connection-terminated'])
    }
    case InstanceMessageType.ShutdownSignal: {
      return i18n.t(($) => $['instance.message.signal-shutdown'])
    }
    case InstanceMessageType.RestartSignal: {
      return i18n.t(($) => $['instance.message.signal-restart'])
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown instance type ${key satisfies never}`)
    }
  }
}

export function translateAuthenticationCodeExpired(i18n: i18n): string {
  return i18n.t(($) => $['instance.message.authentication-code-expired'])
}

export function translateInstanceStatus(i18n: i18n, status: StatusChange): string {
  return i18n.t(($) => $['instance.status.change'], {
    from: translateStatus(i18n, status.from),
    to: translateStatus(i18n, status.to)
  })
}

function translateStatus(i18n: i18n, status: Status): string {
  switch (status) {
    case Status.Fresh: {
      return i18n.t(($) => $['instance.status.fresh'])
    }
    case Status.Connecting: {
      return i18n.t(($) => $['instance.status.connecting'])
    }
    case Status.Connected: {
      return i18n.t(($) => $['instance.status.connected'])
    }
    case Status.Disconnected: {
      return i18n.t(($) => $['instance.status.disconnected'])
    }
    case Status.Ended: {
      return i18n.t(($) => $['instance.status.ended'])
    }
    case Status.Failed: {
      return i18n.t(($) => $['instance.status.failed'])
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown status: ${status satisfies never}`)
    }
  }
}
