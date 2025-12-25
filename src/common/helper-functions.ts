/**
 * Formats a username based on the gamemode
 * @param username
 * @param gamemode
 */
export function formatUsername(username: string, gamemode: string | undefined): string {
  if (gamemode === 'ironman') return `♲ ${username}`
  if (gamemode === 'bingo') return `Ⓑ ${username}`
  if (gamemode === 'island') return `☀ ${username}`

  return username
}

/**
 * Formats a number with suffixes (K, M, B, T, etc.)
 * @param number
 * @param decimals
 */
export function formatNumber(number: number | undefined | null, decimals = 2): string {
  if (number === undefined || number === null || number === 0) return '0'

  const isNegative = number < 0
  const unformattedNumber = Math.abs(number)

  if (unformattedNumber < 100_000) {
    return Number(number).toLocaleString()
  }

  const abbrev = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'S', 'O', 'N', 'D']
  const abbrevIndex = Math.floor(Math.log10(unformattedNumber) / 3)

  // Prevent index out of bounds
  if (abbrevIndex >= abbrev.length) return Number(number).toExponential(decimals)

  const shortNumber = (unformattedNumber / Math.pow(10, abbrevIndex * 3)).toFixed(decimals)

  return `${isNegative ? '-' : ''}${shortNumber}${abbrev[abbrevIndex]}`
}

/**
 * Converts a string to title case
 * @param string_
 */
export function titleCase(string_: string | undefined | null): string {
  if (!string_) return ''
  return string_
    .toLowerCase()
    .replaceAll('_', ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
