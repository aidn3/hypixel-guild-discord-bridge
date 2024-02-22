import { configure } from 'log4js'
import * as logConfig from './config/log4js-config.json'
import * as packageJson from './package.json'
import Application from './src/Application'
import { shutdownApplication } from './src/util/SharedUtil'
import { loadApplicationConfig } from './src/ConfigurationParser'
import { ChannelType, InstanceType } from './src/common/ApplicationEvent'
import { INTERNAL_INSTANCE_PREFIX } from './src/common/ClientInstance'

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
    setInterval(() => {
      app.emit('chat', {
        channelType: ChannelType.OFFICER,
        channelId: undefined,
        instanceName: INTERNAL_INSTANCE_PREFIX + InstanceType.DISCORD,
        instanceType: InstanceType.DISCORD,
        localEvent: true,
        message: `hi there ${Math.random()}`,
        username: 'aidn5',
        replyUsername: undefined
      })
    }, 5000)
  })
  .catch((error): void => {
    logger.fatal(error)
    logger.warn('stopping the process for the controller to restart this node...')
    process.exitCode = 1
  })
