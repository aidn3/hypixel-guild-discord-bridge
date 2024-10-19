import * as console from 'node:console'
import fs from 'node:fs'
import path from 'node:path'

import Logger4js from 'log4js'

import LoggerConfig from './config/log4js-config.json' with { type: 'json' }
import PackageJson from './package.json' with { type: 'json' }
import Application from './src/application.js'
import { loadApplicationConfig } from './src/configuration-parser.js'
import { shutdownApplication } from './src/util/shared-util.js'

console.log('Loading Logger...')
// eslint-disable-next-line import/no-named-as-default-member
const Logger = Logger4js.configure(LoggerConfig).getLogger('Main')

Logger.debug('Setting up process...')
process.on('uncaughtException', function (error) {
  Logger.fatal(error)
  process.exitCode = 1
})

process.title = PackageJson.name

if (process.argv.includes('test-run')) {
  Logger.warn('Argument passed to run in testing mode')
  Logger.warn('Test Loading finished.')
  Logger.warn('Returning from program with exit code 0')
  await shutdownApplication(0)
}

const File = process.argv[2] ?? './config.yaml'
if (!fs.existsSync(File)) {
  Logger.fatal(`File ${File} does not exist.`)
  Logger.fatal(`You can rename config_example.yaml to config.yaml and use it as the configuration file.`)
  Logger.fatal(`If this is the first time running the application, please read README.md before proceeding.`)
  await shutdownApplication(1)
}

const RootDirectory = import.meta.dirname
const ConfigsDirectory = path.resolve(RootDirectory, 'config')
const App = new Application(loadApplicationConfig(File), RootDirectory, ConfigsDirectory)

App.on('all', (name, event) => {
  Logger.log(`[${name}] ${JSON.stringify(event)}`)
})

try {
  await App.sendConnectSignal()
  Logger.info('App is connected')
} catch (error: unknown) {
  Logger.fatal(error)
  Logger.fatal('stopping the process for the controller to restart this node...')
  process.exit(1)
}
