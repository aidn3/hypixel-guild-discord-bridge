import Duration from '../../utility/duration.js'

export interface EconomyChange {
  cooldown: Duration
  amount: number
}

// slightly less than a day to avoid time drifting
export const EconomyDaily: EconomyChange = { cooldown: Duration.hours(22), amount: 10 }

export const EconomyDiss: EconomyChange = { cooldown: Duration.hours(1), amount: 1 }
export const EconomyGlaze: EconomyChange = { cooldown: Duration.minutes(5), amount: 1 }

export const EconomyAirstrike: EconomyChange & { mute: Duration } = {
  cooldown: Duration.minutes(30),
  amount: 50,
  mute: Duration.minutes(3)
}

export const EconomyMute: EconomyChange & { mute: Duration } = {
  cooldown: Duration.minutes(10),
  amount: 50,
  mute: Duration.minutes(5)
}

export const EconomyNuke: EconomyChange & { mute: Duration; maxTargets: number; minTargets: number } = {
  cooldown: Duration.hours(1),
  amount: 200,
  mute: Duration.minutes(3),
  maxTargets: 8,
  minTargets: 4
}

export const EconomyRussianRoulette = { mute: Duration.minutes(15), win: 1, lose: 10 }

export const EconomyEventWin = { amount: 10 }

export const EconomySacrifice = { tax: 50 }

export const EconomyRob = { risk: 2, cooldown: Duration.minutes(10), winChance: 0.35 }

// min=1minute, max=30minutes, conversionRate=slightly worse than airstrike
export const EconomyHitman = { cooldown: Duration.minutes(30), max: 900, min: 30, conversionRate: 2 }

export const EconomyChat: EconomyChange & { usersCountRestriction: number } = {
  cooldown: Duration.minutes(15),
  amount: 1,
  usersCountRestriction: 1
}
