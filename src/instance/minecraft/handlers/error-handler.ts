import assert from 'node:assert'

import { InstanceType } from '../../../common/application-event.js'
import { Status } from '../../../common/client-instance.js'
import EventHandler from '../../../common/event-handler.js'
import type MinecraftInstance from '../minecraft-instance.js'

export const QuitProxyError = 'Proxy encountered a problem while connecting'

export default class StateHandler extends EventHandler<MinecraftInstance> {
  registerEvents(): void {
    const clientSession = this.clientInstance.clientSession
    assert(clientSession)

    clientSession.client.on('error', (error: Error) => {
      this.onError(error)
    })
  }

  private onError(error: Error & { code?: string }): void {
    this.clientInstance.logger.error('Minecraft Bot Error: ', error)
    if (error.code === 'EAI_AGAIN') {
      this.clientInstance.logger.error(
        'Minecraft bot disconnected due to internet problems. Restarting client in 30 seconds...'
      )
      this.restart()
    } else if (error.message.includes('Too Many Requests')) {
      this.clientInstance.logger.error(
        'Microsoft XBOX service throttled due to too many requests. Trying again in 30 seconds...'
      )
      this.restart()
    } else if (error.message.includes('does the account own minecraft')) {
      this.clientInstance.status = Status.Failed
      this.clientInstance.app.emit('statusMessage', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        instanceType: InstanceType.Minecraft,
        message:
          'Error: does the account own minecraft? changing skin (and deleting cache) and reconnecting might help fix the problem.'
      })
    } else if (error.message.includes('Profile not found')) {
      this.clientInstance.status = Status.Failed
      this.clientInstance.app.emit('statusMessage', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        instanceType: InstanceType.Minecraft,
        message: 'Error: Minecraft Profile not found. Deleting cache and reconnecting might help fix the problem.'
      })
    } else if (error.message.includes(QuitProxyError)) {
      this.clientInstance.app.emit('statusMessage', {
        localEvent: true,
        instanceName: this.clientInstance.instanceName,
        instanceType: InstanceType.Minecraft,
        message: 'Error: Encountered problem while working with proxy.'
      })

      this.clientInstance.logger.error('Trying again in 30 seconds...')
      this.restart()
    }
  }

  private restart(): void {
    setTimeout(() => {
      this.clientInstance.connect()
    }, 30_000)
  }
}
