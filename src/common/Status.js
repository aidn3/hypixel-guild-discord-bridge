const Status = {
    FRESH: "fresh", // not configured yet
    CONNECTING: "connecting",
    CONNECTED: "connected", // connected and is doing corn-jobs
    STABLE: "stable", // client is finished all preparations
    RECONNECTING: "reconnecting",
    FAILED: "failed", // won't try to reconnect
}

module.exports = Status