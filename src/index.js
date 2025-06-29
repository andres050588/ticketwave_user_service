import express from "express"
import sequelize from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import cors from "cors"
import redis from "./redisClient.js"
import "./events/subscriber.js"

const app = express()

app.use(
    cors({
        origin: "http://localhost:8080",
        credentials: true
    })
)
app.options(
    "*",
    cors({
        origin: "http://localhost:8080",
        credentials: true
    })
)
app.use(express.json())

app.use("/api", authRoutes)

const MAX_RETRY = 3
async function startServer(retry = MAX_RETRY) {
    try {
        await sequelize.authenticate()
        console.log("Connessione al database riuscita!")
        await sequelize.sync() // aggiungo { force: true } se voglio ressetare i dati nella db

        const PORT = process.env.PORT || 3001
        app.listen(PORT, () => {
            console.log(`User service listening on port ${PORT}`)
        })
    } catch (error) {
        if (retry > 0) {
            console.log(`Riprovo a connettermi... Tentativi rimasti: ${retry}`)
            setTimeout(() => startServer(retry - 1), 5000)
        } else {
            console.error("Impossibile connettersi al database dopo vari tentativi.")
        }
    }
}

startServer()
