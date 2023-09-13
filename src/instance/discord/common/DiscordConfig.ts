export interface DiscordConfig {
  instanceName: string
  key: string
  adminId: string

  publicChannelIds: string[]
  officerChannelIds: string[]
  helperRoleIds?: string[]
  officerRoleIds: string[]

  deleteTempEventAfter: number
}

export enum ColorScheme {
  'GOOD' = 0x008a00,
  'INFO' = 0x848400,
  'BAD' = 0x8a2d00,
  'ERROR' = 0xff0000,
  DEFAULT = 0x090a16
}

export const DefaultCommandFooter = 'Made by aidn5 with <3'
