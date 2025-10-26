import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { Status, StatusVisibility } from '../../../common/connectable-instance.js'
import type EventHelper from '../../../common/event-helper.js'
import SubInstance from '../../../common/sub-instance'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type ClientSession from '../client-session.js'
import type MinecraftInstance from '../minecraft-instance.js'

export const QuitOwnVolition = 'disconnect.quitting'

export const QuitProxyError = 'Proxy encountered a problem while connecting'
export default class StateHandler extends SubInstance<MinecraftInstance, InstanceType.Minecraft, ClientSession> {
  private static readonly MaxLoginAttempts = 5
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
      this.onLogin()
      this.loggedIn = true
    })

    // this will always be called when connection closes
    clientSession.client.on('end', (reason: string) => {
      this.onEnd(clientSession, reason)
      this.loggedIn = false
    })

    // depends on protocol version. One of these will be called
    clientSession.client.on('kick_disconnect', (packet: { reason: string }) => {
      const formattedReason = clientSession.prismChat.fromNotch(packet.reason)
      this.onKicked(formattedReason.toString())
      this.loggedIn = false
    })
    clientSession.client.on('disconnect', (packet: { reason: string }) => {
      const formattedReason = clientSession.prismChat.fromNotch(packet.reason)
      this.onKicked(formattedReason.toString())
      this.loggedIn = false
    })

    clientSession.client.on('error', (error: Error) => {
      this.onError(error)
    })
  }

  private onLogin(): void {
    if (this.loggedIn) return

    this.logger.info('Minecraft client ready, logged in')

    this.loginAttempts = 0
    this.clientInstance.setAndBroadcastNewStatus(Status.Connected, 'Minecraft instance has connected')
  }

  private onEnd(clientSession: ClientSession, reason: string): void {
    if (this.clientInstance.currentStatus() === Status.Failed) {
      const reason = `Status is ${this.clientInstance.currentStatus()}. No further trying to reconnect.`

      this.logger.warn(reason)
      if (clientSession.silentQuit) {
        this.clientInstance.setAndBroadcastNewStatus(Status.Ended, reason, StatusVisibility.Silent)
      } else {
        this.clientInstance.setAndBroadcastNewStatus(Status.Ended, reason)
      }
      return
    } else if (reason === QuitOwnVolition) {
      const reason = 'Client quit on its own volition. No further trying to reconnect.'

      this.logger.debug(reason)
      if (clientSession.silentQuit) {
        this.clientInstance.setAndBroadcastNewStatus(Status.Ended, reason, StatusVisibility.Silent)
      } else {
        this.clientInstance.setAndBroadcastNewStatus(Status.Ended, reason)
      }
      return
    }

    this.tryRestarting()
  }

  private onKicked(reason: string): void {
    this.logger.error(`Minecraft bot was kicked from the server for "${reason}"`)

    this.loginAttempts++
    if (reason.includes('You logged in from another location')) {
      this.logger.fatal('Instance will shut off since someone logged in from another place')
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Failed,
        "Someone logged in from another place.\nWon't try to re-login.\nRestart to reconnect."
      )
    } else if (
      reason.includes('You are permanently banned') ||
      reason.includes('You are temporarily banned') ||
      reason.includes('Your account has been blocked')
    ) {
      this.logger.fatal('Instance will shut off since the account has been banned')
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Failed,
        "Account has been banned/blocked.\nWon't try to re-login.\n"
      )
    } else if (reason.includes('Your account is temporarily blocked')) {
      this.logger.fatal('Instance will shut off since the account has been temporarily blocked')
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Failed,
        "Account has been temporarily blocked.\nWon't try to re-login.\n\n" + reason
      )
    } else {
      // possible kick messages that are accounted for
      // "Your version (1.17.1) of Minecraft is disabled on Hypixel due to compatibility issues."
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        `Client ${this.clientInstance.instanceName} has been kicked.\n` + 'Attempting to reconnect soon\n\n' + reason
      )
    }
  }

  private onError(error: Error & { code?: string }): void {
    this.logger.error('Minecraft Bot Error: ', error)
    this.loginAttempts++

    if (error.code === 'EAI_AGAIN') {
      this.logger.error('Minecraft bot disconnected due to internet problems. Restarting client in 30 seconds...')
      this.tryRestarting()
    } else if (error.message.includes('socket disconnected before secure TLS connection')) {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        'Failed to establish secure connection. Trying again in 30 seconds...'
      )
      this.tryRestarting()
    } else if (error.message.includes('503 Service Unavailable')) {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        'Microsoft XBOX service is down. Trying again in 30 seconds...'
      )
      this.tryRestarting()
    } else if (error.message.includes('Too Many Requests')) {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        'Microsoft XBOX service throttled due to too many requests. Trying again in 30 seconds...'
      )
      this.tryRestarting()
    } else if (error.message.includes('does the account own minecraft')) {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        'Error: does the account own minecraft? changing skin (and deleting cache) and reconnecting might help fix the problem.'
      )
      this.tryRestarting()
    } else if (error.message.includes('Profile not found')) {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        'Error: Minecraft Profile not found. Deleting cache and reconnecting might help fix the problem.'
      )
      this.tryRestarting()
    } else if (error.message.includes(QuitProxyError)) {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        'Error: Encountered problem while working with proxy.'
      )
      this.tryRestarting()
    }
  }

  private tryRestarting(): void {
    this.logger.info(`minecraft attempt ${this.loginAttempts}`)
    if (this.loginAttempts > StateHandler.MaxLoginAttempts) {
      const reason = `Client failed to connect too many times. No further trying to reconnect.`

      this.logger.error(reason)
      this.clientInstance.setAndBroadcastNewStatus(Status.Failed, reason)
      return
    }

    let loginDelay = (this.loginAttempts + 1) * 5000
    if (loginDelay > 60_000) loginDelay = 60_000

    this.clientInstance.setAndBroadcastNewStatus(
      Status.Disconnected,
      `Minecraft bot disconnected from server, attempting reconnect in ${loginDelay / 1000} seconds`
    )

    setTimeout(() => {
      this.clientInstance.automaticReconnect()
    }, loginDelay)
  }
}
