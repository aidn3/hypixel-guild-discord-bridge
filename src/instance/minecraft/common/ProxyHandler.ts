import Http from 'node:http'
import { SocksClient } from 'socks'
import type { Client } from 'minecraft-protocol'
import { Logger } from 'log4js'
import { ProxyConfig, ProxyProtocol } from '../../../ApplicationConfig'

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

  let connect
  switch (protocol) {
    case ProxyProtocol.HTTP: {
      connect = createHttpConnectFunction(logger, proxyHost, proxyPort, host, port)
      break
    }

    case ProxyProtocol.SOCKS5: {
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
      logger.error('proxy encountered a problem')
      logger.error(error)

      logger.error('destroying proxy socket')
      request.destroy(error)

      logger.warn('ending minecraft session if any exist')
      client.end()
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
      .catch((error) => {
        logger.error('proxy encountered a problem')
        console.error(error)

        logger.warn('ending minecraft session if any exist')
        client.end()
      })
  }
}

export interface ClientProxyOptions {
  connect: (client: Client) => void
}
