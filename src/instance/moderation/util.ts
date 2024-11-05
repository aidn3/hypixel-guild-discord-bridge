/**
 * Convert duration number to a duration with prefix
 * @param duration time in milliseconds
 * @return a duration with prefix capped at 1 month. Result always 60 or bigger.
 */
export function durationToMinecraftDuration(duration: number): string {
  // 30 day in seconds
  // Max allowed duration in minecraft. It is a hard limit from server side
  const MaxDuration = 2_592_000
  // 1 minute in seconds. hard limit too
  const MinDuration = 60
  const Prefix = 's' // for "seconds"

  const maxTime = Math.min(MaxDuration, Math.floor(duration / 1000))
  return `${Math.max(maxTime, MinDuration)}${Prefix}`
}
