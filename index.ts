import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { satisfies } from 'compare-versions'
import { DiscordjsError, DiscordjsErrorCodes } from 'discord.js'
import type { Configuration } from 'log4js'
import Logger4js from 'log4js'

import PackageJson from './package.json' with { type: 'json' }
import Application from './src/application.js'
import { Instance } from './src/common/instance'
import { loadApplicationConfig } from './src/configuration-parser.js'
import { loadI18 } from './src/i18next'
import { gracefullyExitProcess } from './src/utility/shared-utility'

const RequiredNodeVersion = PackageJson.engines.node
const ActualNodeVersion = process.versions.node
if (!satisfies(ActualNodeVersion, RequiredNodeVersion)) {
  // eslint-disable-next-line no-restricted-syntax
  console.error(
    `Application can not start due to Node.js being outdated.\n` +
      `This application depends on Node.js to work.\n` +
      `Please update Node.js before trying to launch the application again.\n` +
      'You can download Node.js latest version here: https://nodejs.org/en/download\n' +
      `Current version: ${ActualNodeVersion}, Required version: ${RequiredNodeVersion}`
  )
  process.exit(1)
}

const RootDirectory = import.meta.dirname
const ConfigsDirectory = path.resolve(RootDirectory, 'config')
fs.mkdirSync(ConfigsDirectory, { recursive: true })

const LoggerConfigName = 'log4js-config.json'
const LoggerPath = path.join(ConfigsDirectory, LoggerConfigName)
if (!fs.existsSync(LoggerPath)) {
  fs.copyFileSync(path.join(RootDirectory, 'src', LoggerConfigName), LoggerPath)
}
const LoggerConfig = JSON.parse(fs.readFileSync(LoggerPath, 'utf8')) as Configuration
const Logger = Logger4js.configure(LoggerConfig).getLogger('Main')
let app: Application | undefined

Logger.debug('Setting up process...')
process.on('uncaughtException', function (error) {
  Logger.fatal(error)
  process.exitCode = 1
})

const MaxShutdownSignals = 5
let shutdownSignals = 0

function startShutdown(signal: string) {
  shutdownSignals++

  if (shutdownSignals >= MaxShutdownSignals) {
    process.exit(1)
  } else if (shutdownSignals >= 2) {
    Logger.warn(`Process has caught ${signal} signal. Already shutting down. Wait!!`)
    return
  } else {
    Logger.info(`Process has caught ${signal} signal.`)
    if (app === undefined) {
      void gracefullyExitProcess(0).catch(() => {
        process.exit(1)
      })
    } else {
      Logger.debug('Shutting down application')
      void app
        .shutdown()
        .then(() => gracefullyExitProcess(0))
        .catch(() => {
          process.exit(1)
        })
    }
  }
}

process.on('SIGTERM', (signal) => {
  startShutdown(signal)
})
process.on('SIGINT', (signal) => {
  startShutdown(signal)
})

process.title = PackageJson.name

Logger.debug('Loading up languages...')
const I18n = await loadI18()

if (process.argv.includes('test-run')) {
  Logger.warn('Argument passed to run in testing mode')
  Logger.warn('Test Loading finished.')
  Logger.warn('Returning from program with exit code 0')
  await gracefullyExitProcess(0)
}

const File = process.argv[2] ?? './config.yaml'
if (!fs.existsSync(File)) {
  Logger.fatal(`File ${File} does not exist.`)
  Logger.fatal(`You can rename config_example.yaml to config.yaml and use it as the configuration file.`)
  Logger.fatal(`If this is the first time running the application, please read README.md before proceeding.`)
  await gracefullyExitProcess(1)
}

let applicationLoaded = false
let finalMessage: { messages: string[]; loggerLevel: (message: string) => void } | undefined
try {
  app = new Application(loadApplicationConfig(File), RootDirectory, ConfigsDirectory, I18n.cloneInstance())

  const loggers = new Map<string, Logger4js.Logger>()
  app.onAny((name, event) => {
    let instanceLogger = loggers.get(event.instanceName)
    if (instanceLogger === undefined) {
      instanceLogger = Instance.createLogger(event.instanceName)
      loggers.set(event.instanceName, instanceLogger)
    }
    instanceLogger.log(`[${name}] ${JSON.stringify(event)}`)
  })
  applicationLoaded = true

  await app.start()
  Logger.info('App is connected')
} catch (error: unknown) {
  Logger.fatal('Encountered an error during the application initiation phase', error)
  if (error instanceof DiscordjsError && error.code === DiscordjsErrorCodes.TokenInvalid) {
    finalMessage = {
      messages: [
        'Invalid Discord Token',
        '- Go to https://discord.com/developers/applications',
        '- Create new Discord bot by pressing "New Application" ',
        '- On the left menu, choose "Bot"',
        '- Go to "Privileged Gateway Intents" section',
        '- Enable the following intents: "Server Members Intent", "Message Content Intent"',
        '- After that, go to "Token" section on the page and press "Reset Token".',
        '  A token will be generated, treat it like a password!',
        '- Copy the token and put it inside "config.yaml" file here.',
        '  The token goes in "discord" section "key" field. ',
        '  Make sure the token is surrounded by double quotes "like this"!',
        '- Then restart the application to try again'
      ],
      loggerLevel: (message) => {
        Logger.error(message)
      }
    }
  } else if (error instanceof Error && error.message.includes('Used disallowed intents')) {
    finalMessage = {
      messages: [
        'Missing Discord Bot Intents',
        '- Go to https://discord.com/developers/applications',
        '- Select the discord bot name',
        '- On the left menu, choose "Bot"',
        '- Go to "Privileged Gateway Intents" section',
        '- Enable the following intents: "Server Members Intent", "Message Content Intent"',
        '- Then restart the application to try again'
      ],
      loggerLevel: (message) => {
        Logger.error(message)
      }
    }
  }

  if (applicationLoaded) {
    try {
      assert.ok(app !== undefined)
      Logger.warn('Since application has already began its starting sequence, a graceful shutdown will be attempted.')
      await app.shutdown()
    } catch (error) {
      Logger.error('Failed the shutting down sequence as well.', error)
    }
  }

  Logger.fatal('stopping the process for the controller to restart this node...')
  if (finalMessage !== undefined) {
    showBig(finalMessage.messages, finalMessage.loggerLevel)
  }
  process.exit(1)
}

function showBig(messages: string[], loggerLevel: (message: string) => void) {
  const longestMessage = Math.max(...messages.map((part) => part.length))
  const title = messages.shift()
  assert.ok(title !== undefined)

  loggerLevel('='.repeat(longestMessage + 4))
  const freeSpace = longestMessage - title.length
  loggerLevel('| ' + ' '.repeat(Math.ceil(freeSpace / 2)) + title + ' '.repeat(Math.floor(freeSpace / 2)) + ' |')
  loggerLevel('| ' + ' '.repeat(longestMessage) + ' |')

  for (const message of messages) {
    loggerLevel('| ' + message + ' '.repeat(longestMessage - message.length) + ' |')
  }
  loggerLevel('='.repeat(longestMessage + 4))
}
