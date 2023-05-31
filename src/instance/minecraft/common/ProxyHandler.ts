import MinecraftConfig from "./MinecraftConfig"
import * as ProxyAgent from "proxy-agent"
import * as Http from 'http'
import {SocksClient} from 'socks'
import type {Client} from 'minecraft-protocol'
import {ProxyProtocol} from "../../../common/ProxyInterface"
import {Logger} from "log4js"

export function resolveProxyIfExist(logger: Logger, minecraftConfig: MinecraftConfig): ClientProxyOptions | {} {
    const proxyConfig = minecraftConfig.proxy
    if (proxyConfig == null) return {}
    logger.debug(`Proxy enabled with params: ${minecraftConfig.proxy}`)

    const proxyHost = proxyConfig.proxyHost
    const proxyPort = proxyConfig.proxyPort
    const protocol = proxyConfig.protocol
    const host = minecraftConfig.botOptions.host as string
    const port = minecraftConfig.botOptions.port as number

    const agent = createProxyAgent(protocol, proxyHost, proxyPort)
    let connect
    switch (protocol) {
        case ProxyProtocol.HTTP:
            connect = createHttpConnectFunction(logger, proxyHost, proxyPort, host, port)
            break

        case ProxyProtocol.SOCKS5:
            connect = createSocksConnectFunction(logger, proxyHost, proxyPort, host, port)
            break
        default:
            throw new Error(`Unknown proxy protocol '${protocol}'`)
    }

    return {agent, connect}
}

function createProxyAgent(protocol: string = "http", proxyHost: string, proxyPort: number) {
    return new ProxyAgent({protocol, host: proxyHost, port: proxyPort})
}

function createHttpConnectFunction(logger: Logger, proxyHost: string, proxyPort: number, host: string, port: number) {
    return function (client: Client): void {
        logger.debug("connecting to proxy...")

        const req = Http.request({
            host: proxyHost,
            port: proxyPort,
            method: 'CONNECT',
            path: host + ':' + port
        })
        req.end()

        req.on('connect', (res, stream) => {
            logger.debug("connection to proxy established. forwarding proxied connection to minecraft")
            client.setSocket(stream)
            client.emit('connect')
        })

        req.once('error', (e) => {
            logger.error("proxy encountered a problem")
            logger.error(e)

            logger.error("destroying proxy socket")
            req.destroy(e)

            logger.warn("ending minecraft session if any exist")
            client.end()
        })
    }
}

function createSocksConnectFunction(logger: Logger, proxyHost: string, proxyPort: number, host: string, port: number) {
    return function (client: Client): void {
        logger.debug("connecting to proxy...")

        SocksClient.createConnection({
            proxy: {host: proxyHost, port: proxyPort, type: 5},
            command: 'connect',
            destination: {host, port}

        }).then(connectionEstablished => {
            logger.debug("connection to proxy established. forwarding proxied connection to minecraft")
            client.setSocket(connectionEstablished.socket)
            client.emit('connect')

        }).catch(e => {
            logger.error("proxy encountered a problem")
            console.error(e)

            logger.warn("ending minecraft session if any exist")
            client.end()
        })
    }
}

export interface ClientProxyOptions {
    agent: typeof ProxyAgent
    connect: (client: Client) => void
}

