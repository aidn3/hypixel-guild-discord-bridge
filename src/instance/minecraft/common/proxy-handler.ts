import Http from 'node:http'

import type { Logger } from 'log4js'
import type { Client } from 'minecraft-protocol'
import { SocksClient } from 'socks'

import type { ProxyConfig } from '../../../application-config.js'
import { ProxyProtocol } from '../../../application-config.js'
import { QuitProxyError } from '../handlers/error-handler.js'

export function resolveProxyIfExist(
  logger: Logger,
  proxyConfig: ProxyConfig | null,
  defaultBotOptions: {
    host: string
    port: number
  }
): Partial<ClientProxyOptions> {
  if (!proxyConfig) return {}
  logger.debug(`Proxy enabled with params: ${JSON.stringify(proxyConfig)}`)

  const proxyHost = proxyConfig.host
  const proxyPort = Number(proxyConfig.port)
  const protocol = proxyConfig.protocol
  const host = defaultBotOptions.host
  const port = defaultBotOptions.port

  let connect: (client: Client) => void
  switch (protocol) {
    case ProxyProtocol.Http: {
      connect = createHttpConnectFunction(logger, proxyHost, proxyPort, host, port)
      break
    }

    case ProxyProtocol.Socks5: {
      connect = createSocksConnectFunction(logger, proxyHost, proxyPort, host, port)
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

function createHttpConnectFunction(logger: Logger, proxyHost: string, proxyPort: number, host: string, port: number) {
  return function (client: Client): void {
    logger.debug('connecting to proxy...')

    const request = Http.request({
      host: proxyHost,
      port: proxyPort,
      method: 'CONNECT',
      path: host + ':' + String(port)
    })
    request.end()

    request.on('connect', (response, stream) => {
      logger.debug('connection to proxy established. forwarding proxied connection to minecraft')
      client.setSocket(stream)
      client.emit('connect')
    })

    request.once('error', (error) => {
      client.emit('error', new Error('proxy encountered a problem', { cause: error }))

      logger.error('destroying proxy socket')
      request.destroy(error)
    })
  }
}

function createSocksConnectFunction(logger: Logger, proxyHost: string, proxyPort: number, host: string, port: number) {
  return function (client: Client): void {
    logger.debug('connecting to proxy...')

    SocksClient.createConnection({
      proxy: {
        host: proxyHost,
        port: proxyPort,
        type: 5
      },
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

export interface ClientProxyOptions {
  connect: (client: Client) => void
}
