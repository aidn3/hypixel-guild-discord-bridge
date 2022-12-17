'use strict'

console.log("Loading Logger...")
const logger = require("log4js")
    .configure(require('./config/log4js-config.json'))
    .getLogger("Main")


logger.debug("Test loading all libraries...")
require('dotenv').config()

const packageJson = require('./package.json')

for (let dependency in packageJson.dependencies) {
    logger.trace(`Test-loading ${dependency}...`)
    require(dependency)
}


logger.debug("Loading modules and setting up process...")
process.on('uncaughtException', function (e) {
    logger.fatal(e)
    process.exitCode = 1
})

process.title = packageJson.name

//import metrics = require('./src/util/ApplicationMetric')
//metrics(packageJson.name, packageJson.version)

import Application from "./src/Application"

let app = new Application()


app.on("*", (name, ...args) => {
    logger.log(`[${name}] ${JSON.stringify(args)}`)
})

app.sendConnectSignal()
    .then(() => logger.info("App is connected"))
    .catch(error => {
        logger.fatal(error)
        logger.warn("stopping the process for the controller to restart this node...")
        process.exitCode = 1
    })