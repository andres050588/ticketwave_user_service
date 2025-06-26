import Redis from "ioredis"

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379
})
redis.on("error", err => {
    console.error("Errore connessione Redis:", err)
})

export default redis
