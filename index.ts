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
  shutdownApplication(0)
}

const file = process.argv[2] ?? './config.yaml'

// eslint-disable-next-line unicorn/prefer-module
const configsDirectory = path.resolve(__dirname, 'config')
const app = new Application(loadApplicationConfig(file), configsDirectory)

app.on('*', (name, event) => {
  logger.log(`[${name}] ${JSON.stringify(event)}`)
})

app
  .sendConnectSignal()
  .then(() => {
    logger.info('App is connected')
  })
  .catch((error: unknown): void => {
    logger.fatal(error)
    logger.warn('stopping the process for the controller to restart this node...')
    process.exitCode = 1
  })
