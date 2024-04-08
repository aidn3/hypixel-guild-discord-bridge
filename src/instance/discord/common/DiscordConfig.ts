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
  GOOD = 0x00_8a_00,
  INFO = 0x84_84_00,
  BAD = 0x8a_2d_00,
  ERROR = 0xff_00_00,
  DEFAULT = 0x09_0a_16
}

export const DefaultCommandFooter = "Made by aidn5 with <3"
