import { loadApplicationConfig } from './src/ApplicationConfig'
import * as logConfig from './config/log4js-config.json'
import { configure } from 'log4js'
import * as packageJson from './package.json'
import Application from './src/Application'

console.log('Loading Logger...')
const logger = configure(logConfig).getLogger('Main')

logger.debug('Test loading all libraries...')

for (const dependency in packageJson.dependencies) {
  logger.trace(`Test-loading ${dependency}...`)
  require(dependency)
}

logger.debug('Loading modules and setting up process...')
process.on('uncaughtException', function (e) {
  logger.fatal(e)
  process.exitCode = 1
})

process.title = packageJson.name

const file = process.argv[2] ?? './config.yaml'
const app = new Application(loadApplicationConfig(file))

app.on('*', (name, ...args) => {
  logger.log(`[${name}] ${JSON.stringify(args)}`)
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
