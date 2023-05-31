export interface ProxyConfig {
    proxyHost: string
    proxyPort: number
    protocol: ProxyProtocol
}

export enum ProxyProtocol {
    HTTP = "http",
    SOCKS5 = "socks5"
}
