import { getNetworth as calculateNetworth, getPrices } from 'skyhelper-networth'
import { type Prices } from '../type/skyhelper-networth'

let prices: Prices
void getPrices().then((data): void => {
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

export async function getNetworth(profileData: unknown, bankBalance: number, museumData: unknown): Promise<number> {
  return await calculateNetworth(profileData, bankBalance, {
    prices,
    museumData: museumData,
    onlyNetworth: true
  }).then((response) => response.networth)
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
