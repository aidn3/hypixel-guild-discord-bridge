import assert from 'node:assert'

import type { Logger } from 'log4js'

import type Application from '../../../application.js'
import type { InstanceType } from '../../../common/application-event.js'
import { Status } from '../../../common/client-instance.js'
import EventHandler from '../../../common/event-handler.js'
import type UnexpectedErrorHandler from '../../../common/unexpected-error-handler.js'
import type EventHelper from '../../../util/event-helper.js'
import type MinecraftInstance from '../minecraft-instance.js'

export const QuitOwnVolition = 'disconnect.quitting'

export default class StateHandler extends EventHandler<MinecraftInstance, InstanceType.Minecraft> {
  private static readonly MaxLoginAttempts = 5
  private loginAttempts
  private exactDelay
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
    this.exactDelay = 0
    this.loggedIn = false
  }

  registerEvents(): void {
    const clientSession = this.clientInstance.clientSession
    assert(clientSession)

    // this will only be called after the player receives spawn packet
    clientSession.client.on('login', () => {
      this.onLogin()
      this.loggedIn = true
    })

    // this will always be called when connection closes
    clientSession.client.on('end', (reason: string) => {
      this.onEnd(reason)
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
  }

  private onLogin(): void {
    if (this.loggedIn) return

    this.logger.info('Minecraft client ready, logged in')

    this.loginAttempts = 0
    this.exactDelay = 0
    this.clientInstance.setAndBroadcastNewStatus(Status.Connected, 'Minecraft instance has connected')
  }

  private onEnd(reason: string): void {
    if (this.clientInstance.currentStatus() === Status.Failed) {
      const reason = `Status is ${this.clientInstance.currentStatus()}. No further trying to reconnect.`

      this.logger.warn(reason)
      this.clientInstance.setAndBroadcastNewStatus(Status.Ended, reason)
      return
    } else if (reason === QuitOwnVolition) {
      const reason = 'Client quit on its own volition. No further trying to reconnect.'

      this.logger.debug(reason)
      this.clientInstance.setAndBroadcastNewStatus(Status.Ended, reason)
      return
    } else if (this.loginAttempts > StateHandler.MaxLoginAttempts) {
      const reason = `Client failed to connect too many times. No further trying to reconnect.`

      this.logger.error(reason)
      this.clientInstance.setAndBroadcastNewStatus(Status.Failed, reason)
    }

    let loginDelay = this.exactDelay
    if (loginDelay === 0) {
      loginDelay = (this.loginAttempts + 1) * 5000

      if (loginDelay > 60_000) {
        loginDelay = 60_000
      }
    }

    this.clientInstance.setAndBroadcastNewStatus(
      Status.Disconnected,
      `Minecraft bot disconnected from server, attempting reconnect in ${loginDelay / 1000} seconds`
    )

    setTimeout(() => {
      this.clientInstance.connect()
    }, loginDelay)
  }

  private onKicked(reason: string): void {
    this.logger.error(`Minecraft bot was kicked from the server for "${reason.toString()}"`)

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
    } else {
      this.clientInstance.setAndBroadcastNewStatus(
        Status.Disconnected,
        `Client ${this.clientInstance.instanceName} has been kicked.\n` +
          'Attempting to reconnect soon\n\n' +
          reason.toString()
      )
    }
  }
}
