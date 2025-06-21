import express from "express"
import sequelize from "./config/db.js"

import "./config/db.js"

const app = express()
app.use(express.json())

app.get("/api/users/currentuser", (req, res) => {
    res.send({ currentUser: null })
})

async function startServer() {
    try {
        await sequelize.authenticate()
        console.log("✅ Connessione al database riuscita!")
        await sequelize.sync({ force: true })

        const PORT = process.env.PORT || 3001
        app.listen(PORT, () => {
            console.log(`User service listening on port ${PORT}`)
        })
    } catch (error) {
        console.error("Errore nella connessione al DB:", error)
    }
}

startServer()
