declare module 'skyhelper-networth'

export function getNetworth(
  profileData: unknown,
  bankBalance: number,
  options?: Partial<NetworthOptions>
): Promise<Networth>

export function getPrices(): Promise<Prices>

export interface NetworthOptions {
  cache: boolean
  onlyNetworth: boolean
  prices: Prices
  returnItemData: boolean
  museumData: unknown
}

export type Prices = Record<string, number>

export interface Networth {
  networth: number
}
