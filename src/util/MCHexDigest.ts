// From: https://gist.github.com/andrewrk/4425843

export function MCHexDigest(hash: Buffer) {
  // check for negative hashes
  const negative = hash.readInt8(0) < 0
  if (negative) performTwosCompliment(hash)
  let digest = hash.toString('hex')
  // trim leading zeroes
  digest = digest.replaceAll(/^0+/g, '')
  if (negative) digest = '-' + digest
  return digest
}

function performTwosCompliment(buffer: Buffer) {
  let carry = true
  let index, newByte, value
  for (index = buffer.length - 1; index >= 0; --index) {
    value = buffer.readUInt8(index)
    newByte = ~value & 0xFF
    if (carry) {
      carry = newByte === 0xFF
      buffer.writeUInt8(newByte + 1, index)
    } else {
      buffer.writeUInt8(newByte, index)
    }
  }
}
