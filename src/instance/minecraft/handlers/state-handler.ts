import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { InstanceMessageType } from '../../../common/application-event.js'
import { Status } from '../../../common/connectable-instance.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import Duration from '../../../utility/duration'
import { setTimeoutAsync } from '../../../utility/scheduling'
import { formatTime } from '../../../utility/shared-utility'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance'

export const QuitOwnVolition = 'disconnect.quitting'

export const QuitProxyError = 'Proxy encountered a problem while connecting'
export default class StateHandler extends SubInstance<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  private static readonly MaxLoginAttempts = 100
  private static readonly MaxDuration = Duration.minutes(5)

  private loginAttempts
  private loggedIn

  constructor(
    application: Application,
    clientInstance: MinecraftInstance,
    eventHelper: EventHelper<InstanceType.Minecraft>,
    logger: Logger,
    errorHandler: UnexpectedErrorHandler
  ) {
    super(application, clientInstance, eventHelper, logger, errorHandler)

    this.loginAttempts = 0
    this.loggedIn = false
  }

  public resetLoginAttempts() {
    this.loginAttempts = 0
  }

  override registerEvents(clientSession: ClientSession): void {
    // this will only be called after the player receives spawn packet
    clientSession.client.on('login', () => {
      void this.onLogin().catch(this.errorHandler.promiseCatch('handling login event from Minecraft'))
      this.loggedIn = true
    })

    // this will always be called when connection closes
    clientSession.client.on('end', (reason: string) => {
      void this.onEnd(clientSession, reason).catch(this.errorHandler.promiseCatch('handling end event from Minecraft'))
      this.loggedIn = false
    })

    // depends on protocol version. One of these will be called
    clientSession.client.on('kick_disconnect', (packet: { reason: string }) => {
      const formattedReason = clientSession.prismChat.fromNotch(packet.reason)
      void this.onKicked(formattedReason.toString()).catch(
        this.errorHandler.promiseCatch('handling kick_disconnect event from Minecraft')
      )
      this.loggedIn = false
    })
    clientSession.client.on('disconnect', (packet: { reason: string }) => {
      const formattedReason = clientSession.prismChat.fromNotch(packet.reason)
      void this.onKicked(formattedReason.toString()).catch(
        this.errorHandler.promiseCatch('handling disconnect event from Minecraft')
      )
      this.loggedIn = false
    })

    clientSession.client.on('error', (error: Error) => {
      void this.onError(error).catch(this.errorHandler.promiseCatch('handling error event from Minecraft'))
    })
  }

  private async onLogin(): Promise<void> {
    if (this.loggedIn) return

    this.logger.info('Minecraft client ready, logged in')

    this.loginAttempts = 0
    await this.clientInstance.setAndBroadcastNewStatus(Status.Connected)
    this.logger.info('Minecraft instance has connected')
  }

  private async onEnd(clientSession: ClientSession, reason: string): Promise<void> {
    if (this.clientInstance.currentStatus() === Status.Failed) {
      this.logger.warn(reason)

      if (!clientSession.silentQuit) {
        await this.clientInstance.broadcastInstanceMessage({ type: InstanceMessageType.MinecraftEnded, value: reason })
      }
      return
    } else if (reason === QuitOwnVolition) {
      const reason = 'Client quit on its own volition. No further trying to reconnect.'

      this.logger.debug(reason)
      // eslint-disable-next-line unicorn/prefer-ternary
      if (clientSession.silentQuit) {
        //TODO: properly handle silent quit
        await this.clientInstance.setAndBroadcastNewStatus(Status.Ended)
      } else {
        await this.clientInstance.setAndBroadcastNewStatus(Status.Ended)
      }
      return
    } else {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Ended, {
        type: InstanceMessageType.MinecraftConnectionTerminated,
        value: reason
      })
    }

    this.logger.debug(`Client quit with the reason: ${reason}`)
    await this.tryRestarting()
  }

  private async onKicked(reason: string): Promise<void> {
    this.logger.error(`Minecraft bot was kicked from the server for: ${reason}`)

    this.loginAttempts++
    if (reason.includes('You logged in from another location')) {
      this.logger.fatal('Instance will shut off since someone logged in from another place')
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Failed, {
        type: InstanceMessageType.MinecraftKickedLoggedFromAnotherLocation,
        value: undefined
      })
    } else if (reason.includes('You are permanently banned') || reason.includes('You are temporarily banned')) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Failed, {
        type: InstanceMessageType.MinecraftBanned,
        value: reason
      })
    } else if (
      reason.includes('Your account has been blocked') ||
      reason.includes('Your account is temporarily blocked')
    ) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Failed, {
        type: InstanceMessageType.MinecraftBanned,
        value: reason
      })
      // "Your version (1.17.1) of Minecraft is disabled on Hypixel due to compatibility issues."
    } else if (reason.includes('of Minecraft is disabled on Hypixel due to compatibility issues')) {
      // possible kick messages that are accounted for
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Failed, {
        type: InstanceMessageType.MinecraftIncompatible,
        value: reason
      })
    } else {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Disconnected, {
        type: InstanceMessageType.MinecraftKicked,
        value: reason
      })
    }
  }

  private async onError(error: Error & { code?: string }): Promise<void> {
    this.logger.error('Minecraft Bot Error: ', error)
    this.loginAttempts++

    if (error.code === 'EAI_AGAIN') {
      this.logger.error('Minecraft bot disconnected due to internet problems. Restarting client in 30 seconds...')
      await this.tryRestarting()
    } else if (error.message.includes('socket disconnected before secure TLS connection')) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Disconnected, {
        type: InstanceMessageType.MinecraftInternetProblems,
        value: error.message
      })
      await this.tryRestarting()
    } else if (error.message.includes('503 Service Unavailable')) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Disconnected, {
        type: InstanceMessageType.MinecraftXboxDown,
        value: undefined
      })
      await this.tryRestarting()
    } else if (error.message.includes('Too Many Requests')) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Disconnected, {
        type: InstanceMessageType.MinecraftXboxThrottled,
        value: undefined
      })
      await this.tryRestarting()
    } else if (
      error.message.includes('does the account own minecraft') ||
      error.message.includes('Profile not found')
    ) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Disconnected, {
        type: InstanceMessageType.MinecraftNoAccount,
        value: undefined
      })

      this.application.core.minecraftSessions.clearCachedSessions(this.clientInstance.instanceName)
      await this.tryRestarting()
    } else if (error.message.includes(QuitProxyError)) {
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Disconnected, {
        type: InstanceMessageType.MinecraftProxyBroken,
        value: error.toString() // TODO: give a proper proxy error instead of this
      })
      await this.tryRestarting()
    }
  }

  private async tryRestarting(): Promise<void> {
    this.logger.info(`minecraft attempt ${this.loginAttempts}`)
    if (this.loginAttempts > StateHandler.MaxLoginAttempts) {
      this.logger.error(`Client failed to connect too many times. No further trying to reconnect.`)
      await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Failed, {
        type: InstanceMessageType.MinecraftFailedTooManyTimes,
        value: undefined
      })
      return
    }

    let loginDelay = (this.loginAttempts + 1) * 5000
    if (loginDelay > StateHandler.MaxDuration.toMilliseconds()) loginDelay = StateHandler.MaxDuration.toMilliseconds()

    await this.clientInstance.setAndBroadcastNewStatusWithMessage(Status.Connecting, {
      type: InstanceMessageType.MinecraftRestarting,
      value: formatTime(Math.floor(loginDelay / 1000))
    })

    setTimeoutAsync(() => this.clientInstance.automaticReconnect(), {
      delay: Duration.milliseconds(loginDelay),
      errorHandler: this.errorHandler.promiseCatch('trying to auto reconnect')
    })
  }
}
