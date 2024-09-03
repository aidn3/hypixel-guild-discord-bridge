import * as console from 'node:console'
import fs from 'node:fs'
import path from 'node:path'

import log4js from 'log4js'

import logConfig from './config/log4js-config.json' with { type: 'json' }
import packageJson from './package.json' with { type: 'json' }
import Application from './src/application.js'
import { loadApplicationConfig } from './src/configuration-parser.js'
import { shutdownApplication } from './src/util/shared-util.js'

console.log('Loading Logger...')
// eslint-disable-next-line import/no-named-as-default-member
const logger = log4js.configure(logConfig).getLogger('Main')

logger.debug('Setting up process...')
process.on('uncaughtException', function (error) {
  logger.fatal(error)
  process.exitCode = 1
})

process.title = packageJson.name

if (process.argv.includes('test-run')) {
  logger.warn('Argument passed to run in testing mode')
  logger.warn('Test Loading finished.')
  logger.warn('Returning from program with exit code 0')
  await shutdownApplication(0)
}

const file = process.argv[2] ?? './config.yaml'
if (!fs.existsSync(file)) {
  logger.fatal(`File ${file} does not exist.`)
  logger.fatal(`You can rename config_example.yaml to config.yaml and use it as the configuration file.`)
  logger.fatal(`If this is the first time running the application, please read README.md before proceeding.`)
  await shutdownApplication(1)
}

const rootDirectory = import.meta.dirname
const configsDirectory = path.resolve(rootDirectory, 'config')
const app = new Application(loadApplicationConfig(file), rootDirectory, configsDirectory)

app.on('*', (name, event) => {
  logger.log(`[${name}] ${JSON.stringify(event)}`)
})

try {
  await app.sendConnectSignal()
  logger.info('App is connected')
} catch (error: unknown) {
  logger.fatal(error)
  logger.fatal('stopping the process for the controller to restart this node...')
  process.exit(1)
}
