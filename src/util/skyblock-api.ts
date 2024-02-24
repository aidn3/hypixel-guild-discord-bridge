import { getNetworth as calculateNetworth, getPrices } from 'skyhelper-networth'

let prices: object
void updatePrices()

setInterval(
  () => {
    void updatePrices()
  },
  1000 * 60 * 5
) // 5 minutes

async function updatePrices(): Promise<void> {
  prices = await getPrices()
}

export async function getNetworth(profileData: object, bankBalance: number, museumData: object): Promise<number> {
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

export function formatLevel(level: number, progress: number): number {
  let formattedLevel = 0

  formattedLevel += level

  const decimal = progress / 100

  if (decimal === 1) {
    return formattedLevel
  }

  formattedLevel += decimal

  return formattedLevel
}
