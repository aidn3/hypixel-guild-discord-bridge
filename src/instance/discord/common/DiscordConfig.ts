export interface DiscordConfig {
  instanceName: string
  key: string | null
  adminId: string

  publicChannelIds: string[]
  officerChannelIds: string[]
  helperRoleIds?: string[]
  officerRoleIds: string[]

  deleteTempEventAfter: number
}

export enum ColorScheme {
  GOOD = 0x00_8A_00,
  INFO = 0x84_84_00,
  BAD = 0x8A_2D_00,
  ERROR = 0xFF_00_00,
  DEFAULT = 0x09_0A_16
}

export const DefaultCommandFooter = 'Made by aidn5 with <3'
