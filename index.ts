import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { satisfies } from 'compare-versions'
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
process.on('SIGINT', (signal) => {
  Logger.info(`Process has caught ${signal} signal.`)
  if (app !== undefined) {
    Logger.debug('Shutting down application')
    void app
      .shutdown()
      .then(() => gracefullyExitProcess(0))
      .catch(() => {
        process.exit(1)
      })
  }
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

  await app.start()
  Logger.info('App is connected')
} catch (error: unknown) {
  Logger.fatal(error)
  Logger.fatal('stopping the process for the controller to restart this node...')
  process.exit(1)
}
