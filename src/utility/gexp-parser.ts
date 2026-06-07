export function parseGexpShorthand(input: string): number {
  if (!input) {
    throw new Error('Input is empty.')
  }

  const sanitized = input.trim().toLowerCase()
  let multiplier = 1

  if (sanitized.endsWith('k')) {
    multiplier = 1000
  } else if (sanitized.endsWith('m')) {
    multiplier = 1_000_000
  }

  const numberPart = multiplier === 1 ? sanitized : sanitized.slice(0, -1)
  const parsed = Number.parseFloat(numberPart)

  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid GEXP input: ${input}`)
  }

  return Math.floor(parsed * multiplier)
}
