import * as assert from 'node:assert'
import { io, Socket } from 'socket.io-client'

import { ClientInstance, LOCATION, SCOPE } from '../../common/ClientInstance'
import Application from '../../Application'
import { ChatEvent } from '../../common/ApplicationEvent'
import GlobalConfig from './common/GlobalConfig'

export default class GlobalChatInstance extends ClientInstance<GlobalConfig> {
  private client: Socket | undefined

  constructor(app: Application, instanceName: string, config: GlobalConfig) {
    super(app, instanceName, LOCATION.GLOBAL, config)

    this.app.on('chat', (event) => {
      this.onMessageSend(event)
    })
  }

  connect(): void {
    if (this.client != undefined) this.client.close()

    assert(this.config.key)
    const authData = { accessKey: this.config.key }
    this.client = io(this.config.hostname, { auth: authData })

    this.client.on('connect', () => {
      console.log('Logged in')
    })

    this.client.on('Message', (payload: string) => {
      this.onMessageReceive(payload)
    })
  }

  private onMessageSend(event: ChatEvent): void {
    if (event.instanceName === this.instanceName) return

    if (event.scope === SCOPE.PUBLIC) {
      const payload = JSON.stringify({
        // eslint-disable-next-line unicorn/no-null
        username: null,
        displayName: event.username,
        message: event.message,
        replyUsername: event.replyUsername,
        self: true
      })
      this.client?.emit('Message', payload)
    }
  }

  private onMessageReceive(payload: string): void {
    const parsed = JSON.parse(payload) as GlobalChat
    if (parsed.self) return

    const username: string = parsed.displayName ?? parsed.username

    if (this.app.punishedUsers.mutedTill(username) != undefined) {
      this.logger.debug(`${username} is muted. ignoring this Global message.`)
      return
    }

    this.app.emit('chat', {
      localEvent: true,
      instanceName: this.instanceName,
      location: LOCATION.GLOBAL,
      scope: SCOPE.PUBLIC,
      username,
      channelId: undefined,
      replyUsername: undefined,
      message: parsed.message
    })
  }
}

interface GlobalChat {
  self: boolean
  username: string
  displayName?: string
  message: string
}
