import * as crypto from 'node:crypto'
import axios from 'axios'
import { Bot, createBot } from 'mineflayer'
import { MCHexDigest } from './MCHexDigest'
import { MCPubKeyToPem } from './CryptoUtil'

export interface CustomAuthProvider {
  pre(): Promise<void> // Called before any of the other 3 functions are called
  getUsername(): Promise<string>
  getUuid(): Promise<string> // dashed
  getAccessToken(): Promise<string>
}

/**
 * This will not return until we have authenticated with the target server
 * @param options Mineflayer options
 * @param auth Any instance of an object that implements CustomAuthProvider
 */
export function createCustomAuthBot(options: object, auth: CustomAuthProvider): Promise<Bot> {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises,unicorn/prevent-abbreviations,no-async-promise-executor
  return new Promise(async (res, rej) => {
    await auth.pre()
    const username = await auth.getUsername()
    const uuid = await auth.getUuid()
    const accessToken = await auth.getAccessToken()

    const bot = createBot({ ...options, auth: 'offline', username, profilesFolder: '' })
    bot._client.uuid = uuid

    let serverId: string
    let serverPublicKey: Buffer
    let serverVerifyToken: Buffer
    let globalSharedSecret: Buffer

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const orig_write = bot._client.write
    /*
     * This write hook allows us to intercept authentication and encryption. Allowing us to use our own services to do so.
     * */
    bot._client.write = (function (orig) {
      return function () {
        // eslint-disable-next-line prefer-rest-params
        const [id] = arguments
        if (id === 'encryption_begin') {
          const sharedSecret = crypto.randomBytes(16)

          const hash = crypto
            .createHash('sha1')
            .update(Buffer.from(serverId, 'ascii'))
            .update(sharedSecret)
            .update(serverPublicKey)
            .digest()
          const digest = MCHexDigest(hash)

          axios
            .post(
              'https://sessionserver.mojang.com/session/minecraft/join',
              JSON.stringify({
                accessToken,
                selectedProfile: uuid.replaceAll('-', ''),
                serverId: digest
              }),
              {
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            )
            .then((joinResponse) => {
              if (joinResponse.status === 204) {
                const pubKey = MCPubKeyToPem(serverPublicKey)
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                // eslint-disable-next-line prefer-rest-params,unicorn/prefer-reflect-apply
                orig.apply(this, [
                  'encryption_begin',
                  {
                    sharedSecret: crypto.publicEncrypt(
                      {
                        key: pubKey,
                        padding: crypto.constants.RSA_PKCS1_PADDING
                      },
                      sharedSecret
                    ),
                    verifyToken: crypto.publicEncrypt(
                      {
                        key: pubKey,
                        padding: crypto.constants.RSA_PKCS1_PADDING
                      },
                      serverVerifyToken
                    )
                  }
                ])
                globalSharedSecret = sharedSecret
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                bot._client.setEncryption(sharedSecret)

                // We have successfully completed auth, now we can return the bot instance
                res(bot)
              } else {
                rej(new Error('Failed to join server (auth stage): invalid response code ' + joinResponse.status))
              }
            })
            .catch((error) => {
              rej(new Error('Failed to join server (auth stage): ' + error))
            })

          // Return value is always undefined either way
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          // eslint-disable-next-line prefer-rest-params,unicorn/prefer-reflect-apply
          orig.apply(this, arguments)
          // Return value is always undefined either way
        }
      }
    })(orig_write)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const orig_setEncryption = bot._client.setEncryption
    /**
     * This hook allows us to set our own (the correct) encryption keys on our Mineflayer instance,
     * instead of the ones which are automatically generated. These don't work as Mineflayer isn't in control of the auth.
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    bot._client.setEncryption = (function (orig) {
      return function () {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (globalSharedSecret && !bot._client.cipher) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          // eslint-disable-next-line prefer-rest-params,unicorn/prefer-reflect-apply,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          orig.apply(this, arguments)
          // Return value is always undefined either way
        }
      }
    })(orig_setEncryption)

    bot._client.on('packet', (data, meta) => {
      if (meta.name === 'encryption_begin') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        serverId = data.serverId
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        serverPublicKey = data.publicKey
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        serverVerifyToken = data.verifyToken
      }
    })
  })
}
