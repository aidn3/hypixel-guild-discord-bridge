// public api interfaces. Can't choose a naming convention
/* eslint-disable @typescript-eslint/naming-convention */
export interface UrchinTag {
  added_on: number | bigint // int64
  hide_username: boolean
  reason: string
  tag_type: string
  added_by?: number | bigint | null // int64
  added_by_username?: string | null
  expires_at?: number | bigint | null // int64
}

export interface UrchinPlayerResponse {
  uuid: string
  displayname?: string | null
  tags: UrchinTag[]
}
