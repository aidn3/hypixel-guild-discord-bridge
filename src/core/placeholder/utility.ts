import { capitalize, formatTime, shortenNumber } from '../../utility/shared-utility'

export function formatNumberOptions(): { key: string; apply: (value: number) => string; description: string }[] {
  return [
    { key: 'short', apply: (value) => shortenNumber(value), description: 'Convert number like 1000 to 1k.' },
    {
      key: 'long',
      apply: (value) => value.toString(10),
      description: 'default number to text conversion, which keeps all digits.'
    },
    {
      key: 'duration',
      apply: (value) => formatTime(value),
      description: 'Convert time from milliseconds to shortened version like from 300_000 to 5m.'
    },
    {
      key: 'round',
      apply: (value) => Math.floor(value).toString(10),
      description: 'round decimal numbers to whole value'
    }
  ]
}

export function formatNumber(value: number, options: string[]): string {
  const formatters = formatNumberOptions()
  const formatter = formatters.find((formatter) => options.includes(formatter.key))

  return formatter === undefined ? value.toString(10) : formatter.apply(value)
}

export function formatStringOptions(): { key: string; apply: (value: string) => string; description: string }[] {
  return [
    { key: 'lowercase', apply: (value) => value.toLowerCase(), description: 'Set all letters to lowercase.' },
    { key: 'uppercase', apply: (value) => value.toUpperCase(), description: 'Set all letters to UPPERCASE.' },
    {
      key: 'capitalize',
      apply: (value) => capitalize(value),
      description: 'Set the first letter to UPPERCASE and the rest to lowercase.'
    }
  ]
}

export function formatString(value: string, options: string[]): string {
  const formatters = formatStringOptions()
  const formatter = formatters.find((formatter) => options.includes(formatter.key))

  return formatter === undefined ? value : formatter.apply(value)
}
