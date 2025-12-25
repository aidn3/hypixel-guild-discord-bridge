import type { Auction } from 'hypixel-api-reborn'

import type { ChatCommandContext } from '../../../common/commands.js'
import { ChatCommandHandler } from '../../../common/commands.js'
import { formatNumber } from '../../../common/helper-functions.js'
import { getUuidIfExists, usernameNotExists } from '../common/utility'

export default class AuctionHouse extends ChatCommandHandler {
  private static readonly MaxAuctions = 3

  constructor() {
    super({
      triggers: ['auction', 'ah', 'auctions'],
      description: "Returns a player's active auctions",
      example: `auction %s`
    })
  }

  async handler(context: ChatCommandContext): Promise<string> {
    const givenUsername = context.args[0] ?? context.username

    const uuid = await getUuidIfExists(context.app.mojangApi, givenUsername)
    if (uuid == undefined) return usernameNotExists(context, givenUsername)

    let auctions: Auction[]
    try {
      auctions = await context.app.hypixelApi.getSkyblockAuctionsByPlayer(uuid)
    } catch {
      return `${givenUsername} has no active auctions.`
    }

    const activeAuctions = auctions.filter((auction) => auction.auctionEndTimestamp > Date.now() && !auction.claimed)
    if (activeAuctions.length === 0) return `${givenUsername} has no active auctions.`

    const entries = activeAuctions
      .sort((a, b) => a.auctionEndTimestamp - b.auctionEndTimestamp)
      .slice(0, AuctionHouse.MaxAuctions)
      .map((auction) => formatAuctionEntry(auction))

    const remaining = activeAuctions.length - entries.length
    const remainderSuffix = remaining > 0 ? ` (+${remaining} more)` : ''

    return `${givenUsername}'s Auctions: ${entries.join(' | ')}${remainderSuffix}`
  }
}

function formatAuctionEntry(auction: Auction): string {
  const price = auction.bin ? auction.startingBid : auction.highestBid > 0 ? auction.highestBid : auction.startingBid
  const priceLabel = auction.bin ? 'BIN' : auction.highestBid > 0 ? 'Top Bid' : 'Starting Bid'
  const endsIn = formatTimeRemaining(auction.auctionEndTimestamp)

  return `${auction.item} (${priceLabel} ${formatNumber(price)} | ${endsIn})`
}

function formatTimeRemaining(endTimestamp: number): string {
  const diff = Math.max(0, endTimestamp - Date.now())
  const totalMinutes = Math.max(1, Math.floor(diff / 60_000))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
