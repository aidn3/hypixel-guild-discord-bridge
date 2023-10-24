import EventHandler from '../../../common/EventHandler'
import MinecraftInstance from '../MinecraftInstance'
import { InstanceEventType } from '../../../common/ApplicationEvent'
import { LOCATION, Status } from '../../../common/ClientInstance'

export default class StateHandler extends EventHandler<MinecraftInstance> {
  private loginAttempts
  private exactDelay
  public loggedIn

  constructor(clientInstance: MinecraftInstance) {
    super(clientInstance)

    this.loginAttempts = 0
    this.exactDelay = 0
    this.loggedIn = false
  }

  registerEvents(): void {
    this.clientInstance.client?.on('login', () => {
      this.onLogin()
      this.loggedIn = true
    })
    this.clientInstance.client?.on('end', (reason: string) => {
      this.onEnd(reason)
      this.loggedIn = false
    })
    this.clientInstance.client?.on('kicked', (reason: string) => {
      this.onKicked(reason)
      this.loggedIn = false
    })
  }

  private onLogin(): void {
    if (this.loggedIn) return

    this.clientInstance.logger.info('Minecraft client ready, logged in')

    this.loginAttempts = 0
    this.exactDelay = 0
    this.clientInstance.status = Status.CONNECTED

    this.clientInstance.app.emit('instance', {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      location: LOCATION.MINECRAFT,
      type: InstanceEventType.connect,
      message: 'Minecraft instance has connected'
    })
  }

  private onEnd(reason: string): void {
    if (this.clientInstance.status === Status.FAILED) {
      const reason = `Status is ${this.clientInstance.status}. No further trying to reconnect.`

      this.clientInstance.logger.warn(reason)
      this.clientInstance.app.emit('instance', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        type: InstanceEventType.end,
        message: reason
      })
      return
    } else if (reason === 'disconnect.quitting') {
      const reason = 'Client quit on its own volition. No further trying to reconnect.'

      this.clientInstance.logger.debug(reason)
      this.clientInstance.app.emit('instance', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        type: InstanceEventType.end,
        message: reason
      })
      return
    }

    let loginDelay = this.exactDelay
    if (loginDelay === 0) {
      loginDelay = (this.loginAttempts + 1) * 5000

      if (loginDelay > 60_000) {
        loginDelay = 60_000
      }
    }

    this.clientInstance.logger.error(
      'Minecraft bot disconnected from server,' + `attempting reconnect in ${loginDelay / 1000} seconds`
    )

    this.clientInstance.app.emit('instance', {
      localEvent: true,
      instanceName: this.clientInstance.instanceName,
      location: LOCATION.MINECRAFT,
      type: InstanceEventType.disconnect,
      message: 'Minecraft bot disconnected from server,' + `attempting reconnect in ${loginDelay / 1000} seconds`
    })

    setTimeout(() => {
      this.clientInstance.connect()
    }, loginDelay)
    this.clientInstance.status = Status.CONNECTING
  }

  private onKicked(reason: string): void {
    this.clientInstance.logger.error(reason)
    this.clientInstance.logger.error(`Minecraft bot was kicked from server for "${reason.toString()}"`)

    this.loginAttempts++
    if (reason.includes('You logged in from another location')) {
      this.clientInstance.logger.fatal('Instance will shut off since someone logged in from another place')
      this.clientInstance.status = Status.FAILED

      this.clientInstance.app.emit('instance', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        type: InstanceEventType.conflict,
        message: 'Someone logged in from another place.\n' + "Won't try to re-login.\n" + 'Restart to reconnect.'
      })
    } else if (reason.includes('banned')) {
      this.clientInstance.logger.fatal('Instance will shut off since the account has been banned')
      this.clientInstance.status = Status.FAILED

      this.clientInstance.app.emit('instance', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        type: InstanceEventType.end,
        message: 'Account has been banned.\n' + "Won't try to re-login.\n"
      })
    } else {
      this.clientInstance.app.emit('instance', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        location: LOCATION.MINECRAFT,
        type: InstanceEventType.kick,
        message:
          `Client ${this.clientInstance.instanceName} has been kicked.\n` +
          'Attempting to reconnect soon\n\n' +
          reason.toString()
      })
    }
  }
}
