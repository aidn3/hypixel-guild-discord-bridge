export default interface MetricsConfig {
    enabled: boolean
    port: number
    interval: number
    prefix: string
    useHypixelApi: boolean
    useIngameCommand: boolean
}