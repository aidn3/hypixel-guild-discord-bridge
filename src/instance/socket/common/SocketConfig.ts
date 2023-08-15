export interface SocketConfig {
  instanceName: string
  enabled: boolean
  key: string
  type: SocketType
  port: number
  uri: string
}

export enum SocketType {
  SERVER = 'server',
  CLIENT = 'client'
}
