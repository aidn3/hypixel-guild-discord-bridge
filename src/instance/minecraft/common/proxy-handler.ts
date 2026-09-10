import assert from 'node:assert'
import crypto from 'node:crypto'
import Http from 'node:http'

import type { Logger } from 'log4js'
import type { Client } from 'minecraft-protocol'
import { SocksClient } from 'socks'

import type { ProxyConfig } from '../../../core/minecraft/sessions-manager.js'
import { ProxyProtocol } from '../../../core/minecraft/sessions-manager.js'
import Duration from '../../../utility/duration.js'
import { QuitProxyError } from '../handlers/state-handler.js'

const DefaultProxyTimeout = Duration.seconds(60)

export function resolveProxyIfExist(
  logger: Logger,
  proxyConfig: ProxyConfig | undefined,
  defaultBotOptions: {
    host: string
    port: number
  }
): Partial<ClientProxyOptions> {
  if (!proxyConfig) return {}
  const serializedProxy = serializeRedactedProxy(proxyConfig)
  logger.debug(`Proxy enabled with params: ${serializedProxy.redacted}`)
  logger.debug(`Proxy hash: ${serializedProxy.hashed}`)

  const protocol = proxyConfig.protocol
  const host = defaultBotOptions.host
  const port = defaultBotOptions.port

  let connect: (client: Client) => void
  switch (protocol) {
    case ProxyProtocol.Http: {
      connect = createHttpConnectFunction(logger, proxyConfig, host, port)
      break
    }

    case ProxyProtocol.Socks5: {
      connect = createSocksConnectFunction(logger, proxyConfig, host, port)
      break
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown proxy protocol '${protocol}'`)
    }
  }

  // TODO: Enable agent in the future if ever needed
  return { connect }
}

function createHttpConnectFunction(
  logger: Logger,
  proxyOptions: Omit<ProxyConfig, 'protocol'>,
  host: string,
  port: number
) {
  // code has not been tested yet
  assert.fail('Not supported')

  return function (client: Client): void {
    logger.debug('connecting to proxy...')

    const request = Http.request({
      host: proxyOptions.host,
      port: proxyOptions.port,
      username: proxyOptions.user,
      password: proxyOptions.password,
      method: 'CONNECT',
      path: host + ':' + String(port),
      timeout: DefaultProxyTimeout.toMilliseconds()
    })
    request.end()

    request.once('connect', (response, stream) => {
      if (response.statusCode !== 200) {
        request.destroy(new Error(`Status code not 200. Actual=${response.statusCode}`))
        return
      }

      logger.debug('connection to proxy established. forwarding proxied connection to minecraft')
      client.setSocket(stream)
      client.emit('connect')
    })

    request.once('error', (error) => {
      client.emit('error', new Error(QuitProxyError, { cause: error }))
      logger.warn('ending minecraft session if any exist')
      client.end()

      logger.error('destroying proxy socket')
      request.destroy()
    })
  }
}

function createSocksConnectFunction(
  logger: Logger,
  proxyOptions: Omit<ProxyConfig, 'protocol'>,
  host: string,
  port: number
) {
  return function (client: Client): void {
    logger.debug('connecting to proxy...')

    SocksClient.createConnection({
      proxy: {
        host: proxyOptions.host,
        port: proxyOptions.port,
        type: 5,

        userId: proxyOptions.user,
        password: proxyOptions.password
      },

      timeout: DefaultProxyTimeout.toMilliseconds(),
      command: 'connect',
      destination: {
        host,
        port
      }
    })
      .then((connectionEstablished) => {
        logger.debug('connection to proxy established. forwarding proxied connection to minecraft')
        client.setSocket(connectionEstablished.socket)
        client.emit('connect')
      })
      .catch((error: unknown) => {
        /*
         * This is a workaround to problems with proxy.
         * When proxy encounters a problem DURING the connecting phase,
         * the instance will just enter a deadlock.
         * The only resolution is to pass an error
         * and detect that specific error from the error handler side.
         *
         * This specific error message is detected and handled at: ../handlers/error-handler.ts
         */
        client.emit('error', new Error(QuitProxyError, { cause: error }))

        logger.warn('ending minecraft session if any exist')
        client.end()
      })
  }
}

function serializeRedactedProxy(config: ProxyConfig) {
  return {
    redacted: JSON.stringify({
      id: config.id,
      protocol: config.protocol,
      host: '<REDACTED>',
      port: config.port,
      user: '<REDACTED>',
      password: '<REDACTED>'
    } satisfies ProxyConfig),

    hashed: crypto.hash(
      'sha256',
      JSON.stringify({
        protocol: config.protocol,
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password
      } satisfies Omit<ProxyConfig, 'id'>)
    )
  }
}

export interface ClientProxyOptions {
  connect: (client: Client) => void
}
