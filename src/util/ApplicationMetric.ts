import os = require( "os")
import request = require("https")

const METRICS_URL = "https://metrics.aidn5.com/"
const FREQUENCY = 5 * 60 * 1000 // 5 minutes


function sendIntervalMetrics(name: string | undefined, version: string | undefined) {
    name = name ? name : process.title
    name = name
        .replaceAll("-", "_")
        .replaceAll(" ", "_")
    version = version ? version : process.env.npm_package_version

    let url = METRICS_URL
        + `?name=${name}`
        + `&application_version=${process.version}` // for nodejs version range support
        + `&client_version=${version}` // for long-term support, backward compatibility.
        + `&uuid=null` // for unique users count (not set)
        + `&os=${process.platform}` // to update and focus on the main used platform
        + `&os_version=${os.release()}` // for issues regarding specific versions

    request.get(url)
}

export default (name: string | undefined, version: string | undefined) => {
    setInterval(() => sendIntervalMetrics(name, version), FREQUENCY)
}
