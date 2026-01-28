import { HypixelLink } from './common'

export function stufEncode(message: string): string {
  return message
    .split(' ')
    .map((part) => {
      try {
        if ((part.startsWith('https:') || part.startsWith('http')) && !HypixelLink.test(part)) {
          return encode(part)
        }
      } catch {
        /* ignored */
      }
      return part
    })
    .join(' ')
}

export function stufDecode(message: string): string {
  return message
    .split(' ')
    .map((part) => {
      try {
        if (part.startsWith('l$')) return decode(part)
      } catch {
        /* ignored */
      }

      return part
    })
    .join(' ')
}

// Modified version of https://github.com/stuffyerface/STuF
/**
 * Decodes a string in Standardized Truncated url Format.
 * @param {String} string - The String to Decode.
 */
function decode(string: string): string {
  if (!string.startsWith('l$')) {
    throw new Error('String does not appear to be in STuF')
  }
  const prefix = string[2]
  const suffix = string[3]
  // eslint-disable-next-line unicorn/prefer-spread
  const dotIndices = string.slice(4, string.indexOf('|')).split('').map(Number)
  const urlBody = string.slice(string.indexOf('|') + 1)

  const first9 = urlBody.slice(0, 9 - dotIndices.length)
  const then = urlBody.slice(9 - dotIndices.length).replaceAll('^', '.')

  let url = first9 + then
  url = charInc(url, -1)

  // Restore the dots in the first part of the URL
  for (const index of dotIndices) {
    url = url.slice(0, index) + '.' + url.slice(index)
  }

  // Add the prefix back
  if (prefix === 'h') {
    url = 'http://' + url
  } else if (prefix === 'H') {
    url = 'https://' + url
  }

  // Add the suffix back
  switch (suffix) {
    case '1': {
      url += '.png'

      break
    }
    case '2': {
      url += '.jpg'

      break
    }
    case '3': {
      url += '.jpeg'

      break
    }
    case '4': {
      url += '.gif'

      break
    }
    // No default
  }

  return url
}

/**
 * Encodes a string in Standardized Truncated url Format.
 * @param {String} url - The URL to Encode.
 */
function encode(url: string): string {
  let encoded = 'l$'
  if (url.startsWith('http://')) {
    encoded += 'h'
    url = url.slice(7) // Remove the 'http://' part
  } else if (url.startsWith('https://')) {
    encoded += 'H'
    url = url.slice(8) // Remove the 'https://' part
  }

  if (url.endsWith('.png')) {
    encoded += '1'
    url = url.slice(0, -4) // Remove the '.png' part
  } else if (url.endsWith('.jpg')) {
    encoded += '2'
    url = url.slice(0, -4) // Remove the '.jpg' part
  } else if (url.endsWith('.jpeg')) {
    encoded += '3'
    url = url.slice(0, -5) // Remove the '.jpeg' part
  } else if (url.endsWith('.gif')) {
    encoded += '4'
    url = url.slice(0, -4) // Remove the '.gif' part
  } else {
    encoded += '0'
  }

  const dotIndices = []
  for (let index = 0; index < url.length && index <= 8; index++) {
    if (url[index] === '.') {
      dotIndices.push(index)
      if (dotIndices.length === 9) break // Stop after 9 dots
    }
  }

  let first9 = url.slice(0, 9)
  const then = url.slice(9).replaceAll('.', '^')
  first9 = first9.replaceAll('.', '')
  const shifted = charInc(first9 + then, 1)

  encoded += dotIndices.map((index) => index.toString()).join('') + '|'
  encoded += shifted

  return encoded
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function charInc(string_: string, int: number) {
  const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let incrementedString = ''
  for (const char of string_) {
    const index = charSet.indexOf(char)

    if (index == -1) {
      incrementedString += char
    } else {
      let offset = index + int
      while (offset >= charSet.length) {
        offset -= charSet.length
      }
      while (offset < 0) {
        offset += charSet.length
      }
      const nextChar = charSet[offset]
      incrementedString += nextChar
    }
  }
  return incrementedString
}
