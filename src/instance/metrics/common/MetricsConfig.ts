export default interface MetricsConfig {
    instanceName: string
    enabled: boolean
    port: number
    prefix: string
    useHypixelApi: boolean
    useIngameCommand: boolean
    interval: number
}