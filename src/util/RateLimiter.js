class RateLimiter {
    #maxCount
    #interval

    #currentCount = 0
    #lastRequest = 0
    #lastReset = 0

    constructor(count, interval) {
        this.#maxCount = count
        this.#interval = interval
    }

    execute(func) {
        this.wait().then(func)
    }

    async wait(...args) {
        let currentTime
        while (true) {
            currentTime = new Date().getTime()

            if (currentTime > this.#lastReset + this.#interval) {
                this.#lastReset = currentTime
                this.#currentCount = 0
                break
            }

            if (this.#currentCount < this.#maxCount) {
                break
            }

            await new Promise(r => setTimeout(r, 10))
        }

        this.#currentCount++
        this.#lastRequest = currentTime

        return args
    }
}

module.exports = RateLimiter