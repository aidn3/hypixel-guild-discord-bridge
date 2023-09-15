import MinecraftConfig from './MinecraftConfig'
import * as Http from 'http'
import { SocksClient } from 'socks'
import type { Client } from 'minecraft-protocol'
import { ProxyProtocol } from '../../../common/ProxyInterface'
import { Logger } from 'log4js'
import * as assert from 'assert'

export function resolveProxyIfExist(logger: Logger, minecraftConfig: MinecraftConfig): Partial<ClientProxyOptions> {
  const proxyConfig = minecraftConfig.proxy
  if (proxyConfig == null) return {}
  logger.debug(`Proxy enabled with params: ${JSON.stringify(minecraftConfig.proxy)}`)

  assert(minecraftConfig.botOptions.host)
  const proxyHost = proxyConfig.proxyHost
  const proxyPort = Number(proxyConfig.proxyPort)
  const protocol = proxyConfig.protocol
  const host = minecraftConfig.botOptions.host
  const port = Number(minecraftConfig.botOptions.port)

  let connect
  switch (protocol) {
    case ProxyProtocol.HTTP:
      connect = createHttpConnectFunction(logger, proxyHost, proxyPort, host, port)
      break

    case ProxyProtocol.SOCKS5:
      connect = createSocksConnectFunction(logger, proxyHost, proxyPort, host, port)
      break
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown proxy protocol '${protocol}'`)
  }

  // TODO: Enable agent in the future if ever needed
  return { connect }
}

function createHttpConnectFunction(logger: Logger, proxyHost: string, proxyPort: number, host: string, port: number) {
  return function (client: Client): void {
    logger.debug('connecting to proxy...')

    const req = Http.request({
      host: proxyHost,
      port: proxyPort,
      method: 'CONNECT',
      path: host + ':' + String(port)
    })
    req.end()

    req.on('connect', (res, stream) => {
      logger.debug('connection to proxy established. forwarding proxied connection to minecraft')
      client.setSocket(stream)
      client.emit('connect')
    })

    req.once('error', (e) => {
      logger.error('proxy encountered a problem')
      logger.error(e)

      logger.error('destroying proxy socket')
      req.destroy(e)

      logger.warn('ending minecraft session if any exist')
      client.end()
    })
  }
}

function createSocksConnectFunction(logger: Logger, proxyHost: string, proxyPort: number, host: string, port: number) {
  return function (client: Client): void {
    logger.debug('connecting to proxy...')

    SocksClient.createConnection({
      proxy: { host: proxyHost, port: proxyPort, type: 5 },
      command: 'connect',
      destination: { host, port }
    })
      .then((connectionEstablished) => {
        logger.debug('connection to proxy established. forwarding proxied connection to minecraft')
        client.setSocket(connectionEstablished.socket)
        client.emit('connect')
      })
      .catch((e) => {
        logger.error('proxy encountered a problem')
        console.error(e)

        logger.warn('ending minecraft session if any exist')
        client.end()
      })
  }
}

export interface ClientProxyOptions {
  connect: (client: Client) => void
}
