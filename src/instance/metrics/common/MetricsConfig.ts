export default interface MetricsConfig {
  instanceName: string
  enabled: boolean
  port: number
  prefix: string
  useIngameCommand: boolean
  interval: number
}
