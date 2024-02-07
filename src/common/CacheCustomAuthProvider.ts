import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import axios from 'axios'
import { CustomAuthProvider } from '../util/MineFlayerCustomAuth'

interface Cached {
  username: string
  uuid: string // Not dashed
  accessToken: string
  refreshToken: string
}

interface Session {
  username: string
  uuid: string // Dashed
  accessToken: string
}

// TODO Store expiration dates in cache
export class CacheCustomAuthProvider implements CustomAuthProvider {
  constructor(
    private readonly identifier: string /* doesn't have to be anything fancy, just used for determining cache location */,
    private readonly clientId: string,
    private readonly redirectUri: string, // Just has to be allowed for your given clientId, isn't actually used anywhere
    private readonly initialRefreshToken: string
  ) {}

  private getFolder() {
    const folder = path.join(os.homedir(), '.minecraft', 'hypixel-guild-discord-bridge-cache')
    if (!fs.existsSync(folder))
      fs.mkdirSync(folder, {
        recursive: true
      })

    return folder
  }

  private getFile() {
    return path.join(this.getFolder(), `${this.identifier}_with_${this.clientId}.json`)
  }

  private async refreshToken(refreshToken: string) {
    const response = await axios.post(
      'https://login.live.com/oauth20_token.srf',
      new URLSearchParams({
        client_id: this.clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: this.redirectUri
      })
    )
    const data = response.data as {
      access_token: string
      refresh_token: string
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    }
  }

  private async authXBL(authToken: string) {
    const response = await axios.post(
      'https://user.auth.xboxlive.com/user/authenticate',
      JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${authToken}`
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      }),
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )
    const data = response.data as {
      Token: string
    }

    return {
      token: data.Token
    }
  }

  private async authXSTS(XBLToken: string) {
    const response = await axios.post(
      'https://xsts.auth.xboxlive.com/xsts/authorize',
      JSON.stringify({
        Properties: {
          UserTokens: [XBLToken],
          SandboxId: 'RETAIL'
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      }),
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )
    const data = response.data as {
      Token: string
      DisplayClaims: {
        xui: [
          {
            uhs: string
          }
        ]
      }
    }

    return {
      token: data.Token,
      uhs: data.DisplayClaims.xui[0].uhs
    }
  }

  private async authMinecraft(XSTSToken: string, uhs: string) {
    const response = await axios.post(
      'https://api.minecraftservices.com/authentication/login_with_xbox',
      JSON.stringify({
        identityToken: `XBL3.0 x=${uhs};${XSTSToken}`
      }),
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    )
    const data = response.data as {
      access_token: string
    }

    return data.access_token
  }

  private async getProfile(accessToken: string) {
    const response = await axios.get('https://api.minecraftservices.com/minecraft/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    const data = response.data as {
      id: string
      name: string
    }

    return {
      uuid: data.id,
      username: data.name
    }
  }

  private toDashed(uuid: string) {
    return (
      uuid.slice(0, 8) +
      '-' +
      uuid.slice(8, 12) +
      '-' +
      uuid.slice(12, 16) +
      '-' +
      uuid.slice(16, 20) +
      '-' +
      uuid.slice(20, 32)
    )
  }

  // This isn't actually set at runtime, however this is set in pre() which is called before any of the methods that actually use this field
  private session: Session = undefined as never

  private async newSession(refreshToken: string) {
    // assume accessToken expired, refresh it
    const step1 = await this.refreshToken(refreshToken)
    const step2 = await this.authXBL(step1.accessToken)
    const step3 = await this.authXSTS(step2.token)
    const step4 = await this.authMinecraft(step3.token, step3.uhs)
    const step5 = await this.getProfile(step4)

    this.session = {
      accessToken: step4,
      username: step5.username,
      uuid: this.toDashed(step5.uuid)
    }

    fs.writeFileSync(
      this.getFile(),
      JSON.stringify(
        {
          refreshToken: step1.refreshToken,
          accessToken: step4,
          username: step5.username,
          uuid: step5.uuid
        } as Cached,
        undefined,
        2
      )
    )
  }

  async pre(): Promise<void> {
    if (fs.existsSync(this.getFile())) {
      const d = JSON.parse(
        fs.readFileSync(this.getFile(), {
          encoding: 'utf8'
        })
      ) as Cached

      try {
        const profile = await this.getProfile(d.accessToken)
        this.session = {
          accessToken: d.accessToken,
          username: profile.username,
          uuid: this.toDashed(profile.uuid)
        }
      } catch {
        await this.newSession(d.refreshToken)
      }
    } else {
      await this.newSession(this.initialRefreshToken)
    }
  }

  getAccessToken(): Promise<string> {
    return Promise.resolve(this.session.accessToken)
  }

  getUsername(): Promise<string> {
    return Promise.resolve(this.session.username)
  }

  getUuid(): Promise<string> {
    return Promise.resolve(this.session.uuid)
  }
}
