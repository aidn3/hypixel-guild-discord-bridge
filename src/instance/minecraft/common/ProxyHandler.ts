import MinecraftConfig from "./MinecraftConfig"
import ProxyAgent from "proxy-agent"
import * as Http from 'http'
import {SocksClient} from 'socks'
import type {Client} from 'minecraft-protocol'
import {ProxyProtocol} from "../../../common/ProxyInterface"

// TODO: use proper logger
export default function resolveProxyIfExist(minecraftConfig: MinecraftConfig): ClientProxyOptions | {} {
    const proxyConfig = minecraftConfig.proxy
    if (proxyConfig == null) return {}

    const proxyHost = proxyConfig.proxyHost
    const proxyPort = proxyConfig.proxyPort
    const protocol = proxyConfig.protocol
    const host = minecraftConfig.botOptions.host as string
    const port = minecraftConfig.botOptions.port as number

    const agent = createProxyAgent(protocol, proxyHost, proxyPort)
    let connect
    switch (protocol) {
        case ProxyProtocol.HTTP:
            connect = createHttpConnectFunction(proxyHost, proxyPort, host, port)
            break

        case ProxyProtocol.SOCKS5:
            connect = createSocksConnectFunction(proxyHost, proxyPort, host, port)
            break
        default:
            throw new Error(`Unknown proxy protocol '${protocol}'`)
    }

    return {agent, connect}
}

function createProxyAgent(protocol: string = "http", proxyHost: string, proxyPort: number) {
    return new ProxyAgent({protocol, host: proxyHost, port: proxyPort})
}

function createHttpConnectFunction(proxyHost: string, proxyPort: number, host: string, port: number) {
    return function (client: Client): void {
        const req = Http.request({
            host: proxyHost,
            port: proxyPort,
            method: 'CONNECT',
            path: host + ':' + port
        })
        req.end()

        req.on('connect', (res, stream) => {
            client.setSocket(stream)
            client.emit('connect')
        })

        req.once('error', (e) => {
            console.error(e)
            req.destroy(e)
        })

        //TODO: catch error
    }
}

function createSocksConnectFunction(proxyHost: string, proxyPort: number, host: string, port: number) {
    return function (client: Client): void {
        SocksClient.createConnection({
            proxy: {host: proxyHost, port: proxyPort, type: 5},
            command: 'connect',
            destination: {host, port}

        }).then(connectionEstablished => {
            client.setSocket(connectionEstablished.socket)
            client.emit('connect')

        }).catch(e => {
            console.error(e)
            // client.emit("connect_error", new Error())
            // TODO: inform main cluster about the error to retry
        })
    }
}

export interface ClientProxyOptions {
    agent: ProxyAgent
    connect: (client: Client) => void
}

