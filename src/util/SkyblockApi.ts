// @ts-expect-error type not exist
import { getNetworth as calculateNetworth, getPrices } from 'skyhelper-networth'

let prices = {}
getPrices().then((data: any): void => {
  prices = data
})
setInterval(
  () => {
    void (async () => {
      prices = await getPrices()
    })()
  },
  1000 * 60 * 5
) // 5 minutes

export async function getNetworth(profileData: any, bankBalance: number): Promise<number> {
  return calculateNetworth(profileData, bankBalance, {
    prices,
    onlyNetworth: true
  }).then((res: { networth: number }) => res.networth)
}

export function getSelectedProfile(playerUuid: string, profiles: Array<{ members: any[string] }>): any | undefined {
  let selectedProfile = profiles[0]
  for (const profile of profiles) {
    if (profile.members[playerUuid].last_save > selectedProfile.members[playerUuid].last_save) {
      selectedProfile = profile
    }
  }
  return selectedProfile
}

export function localizedNetworth(coins: number): string {
  let suffix = ''
  if (coins > 1000) {
    coins = coins / 1000
    suffix = 'k'
  }
  if (coins > 1000) {
    coins = coins / 1000
    suffix = 'm'
  }
  if (coins > 1000) {
    coins = coins / 1000
    suffix = 'b'
  }

  return coins.toFixed(3) + suffix
}
