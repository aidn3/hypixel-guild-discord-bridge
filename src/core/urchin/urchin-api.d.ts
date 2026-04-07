// public api interfaces. Can't choose a naming convention
/* eslint-disable @typescript-eslint/naming-convention */
export interface UrchinTag {
  type: string
  reason: string
  added_by?: number
  added_on: string
  hide_username: boolean
}

export interface UrchinPlayerResponse {
  uuid: string
  tags: UrchinTag[]
  rate_limit: number
}
