import type { Items } from 'skyhelper-networth/types/ProfileNetworthCalculator'

declare module 'skyhelper-networth' {
  export class ProfileNetworthCalculator {
    /**
     * Creates a new instance of ProfileNetworthCalculator.
     */
    constructor(profileData: object, museumData?: object, bankBalance?: number)

    /**
     * Gets the networth of the player.
     */
    getNetworth(options?: NetworthOptions): Promise<NetworthResult>

    /**
     * Gets the networth of the player without the cosmetic items.
     */
    getNonCosmeticNetworth(options?: NetworthOptions): Promise<NetworthResult>

    /**
     * Returns the instance of the ProfileNetworthCalculator.
     */
    fromPreParsed(profileData: object, items: Items, bankBalance: number): ProfileNetworthCalculator
  }
}
