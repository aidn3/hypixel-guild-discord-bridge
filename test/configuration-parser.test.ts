import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { loadApplicationConfig } from '../src/configuration-parser.js'

function writeTempYaml(content: string): string {
  const tmp = path.join(os.tmpdir(), `hypixel-config-test-${Date.now()}.yaml`)
  fs.writeFileSync(tmp, content, 'utf8')
  return tmp
}

function buildMinimalConfig(adminIds: string | number[]) {
  return `version: 2
general:
  hypixelApiKey: "test-key"
  shareMetrics: false
discord:
  key: "discord-key"
  adminIds: ${JSON.stringify(adminIds)}
prometheus:
  enabled: false
  port: 9090
  prefix: "hypixel_bridge_"
`
}

// Test numeric admin id (unquoted) will be coerced to string
const numericYaml = buildMinimalConfig([1174785696528072738 as unknown as number])
const numericPath = writeTempYaml(numericYaml)
const numericConfig = loadApplicationConfig(numericPath)
if (!Array.isArray(numericConfig.discord.adminIds)) throw new Error('adminIds not an array')
if (typeof numericConfig.discord.adminIds[0] !== 'string') throw new Error('numeric adminId was not coerced to string')
console.log('PASS: numeric adminId coerced to string')

// Test string admin id remains string
const stringYaml = buildMinimalConfig(["1174785696528072738"])
const stringPath = writeTempYaml(stringYaml)
const stringConfig = loadApplicationConfig(stringPath)
if (typeof stringConfig.discord.adminIds[0] !== 'string') throw new Error('string adminId is not string')
console.log('PASS: string adminId remains string')

console.log('All configuration-parser tests passed')
