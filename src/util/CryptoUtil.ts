// From: MineFlayer
export function MCPubKeyToPem(mcPubKeyBuffer: Buffer) {
  let pem = '-----BEGIN PUBLIC KEY-----\n'
  let base64PubKey = mcPubKeyBuffer.toString('base64')
  const maxLineLength = 65
  while (base64PubKey.length > 0) {
    pem += base64PubKey.slice(0, Math.max(0, maxLineLength)) + '\n'
    base64PubKey = base64PubKey.slice(Math.max(0, maxLineLength))
  }
  pem += '-----END PUBLIC KEY-----\n'
  return pem
}
