import { configure } from 'log4js'

import logConfig from './config/log4js-config.json'
import packageJson from './package.json'
import Application from './src/application'
import { loadApplicationConfig } from './src/configuration-parser'
import { shutdownApplication } from './src/util/shared-util'

console.log('Loading Logger...')
const logger = configure(logConfig).getLogger('Main')

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
const app = new Application(loadApplicationConfig(file))

app.on('*', (name, event) => {
  logger.log(`[${name}] ${JSON.stringify(event)}`)
})

app
  .sendConnectSignal()
  .then(() => {
    logger.info('App is connected')
  })
  .catch((error): void => {
    logger.fatal(error)
    logger.warn('stopping the process for the controller to restart this node...')
    process.exitCode = 1
  })
