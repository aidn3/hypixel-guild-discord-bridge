import Duration from '../../utility/duration'

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
  amount: 200,
  mute: Duration.minutes(3)
}

export const EconomyMute: EconomyChange & { mute: Duration } = {
  cooldown: Duration.minutes(10),
  amount: 50,
  mute: Duration.minutes(5)
}

export const EconomyRussianRoulette = { mute: Duration.minutes(15), win: 1, lose: 10 }

export const EconomyEvenWin = { amount: 10 }

export const EconomySacrifice = { tax: 90 }
