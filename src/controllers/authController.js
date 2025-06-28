import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import redis from "../redisClient.js"
import { isAdmin } from "../middleware/isAdmin.js" // per funzioni future

const generateToken = (user, expiresIn = "1h") => {
    return jwt.sign({ userId: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn })
}

// -----------------------------logica di registrazzione
export const register = async (request, response) => {
    try {
        const { name, email, password } = request.body
        if (!name || !email || !password) {
            return response.status(400).json({ error: "Nome, email o password assenti" })
        }
        // Controllo se l'user esistesse gia
        const existingUser = await User.findOne({ where: { email } })
        if (existingUser) {
            return response.status(409).json({ error: "User gia esistente" })
        }
        // Criptazzione password
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        })

        const token = generateToken(user, "1h")
        const createdAt = user.createdAt?.toISOString() || new Date().toISOString()
        await redis.set(
            `user:${user.id}`,
            JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt
            })
        )

        await redis.publish(
            "user-aggiornato",
            JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt
            })
        )
        return response.status(201).json({ token })
    } catch (error) {
        console.error("Errore durante la registrazione: ", error)
        return response.status(500).json({ error: "Errore server" })
    }
}

// -----------------------------Logica di login
export const login = async (request, response) => {
    try {
        const { email, password } = request.body
        if (!email || !password) {
            return response.status(400).json({ error: "Email e password sono obligatorie" })
        }

        const user = await User.findOne({ where: { email } })
        if (!user) {
            return response.status(401).json({ error: "Email o password non validi" })
        }

        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
            return response.status(401).json({ error: "Email o password non validi" })
        }

        const token = generateToken(user, "4h")
        return response.status(200).json({ token })
    } catch (error) {
        console.error("Errore nel login", error.message)
        return response.status(500).json({ error: error.message })
    }
}

// -----------------------------User profile (dati del profilo logato)

export const userProfile = async (request, response) => {
    try {
        const userId = request.user.userId
        // Si legge i dati dalla cache Redis
        const cachedUser = await redis.get(`user:${userId}`)
        if (cachedUser) {
            return response.json(JSON.parse(cachedUser))
        }

        // Se non è in cache, leggi dal DB
        const user = await User.findByPk(userId, {
            attributes: ["id", "name", "email", "createdAt"]
        })
        if (!user) {
            return response.status(404).json({ error: "Utente non trovato" })
        }

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString()
        }

        // Si salva nella cache Redis
        await redis.set(`user:${userId}`, JSON.stringify(userData))

        return response.json(userData)
    } catch (error) {
        console.error("Errore nel recupero del profilo")
        return response.status(500).json({ error: "Errore server" })
    }
}

// -----------User profile update (dati del profilo visto da user stesso)

export const updateUserProfile = async (req, res) => {
    const userId = req.params.id
    const { name, email } = req.body

    if (!name && !email) {
        return res.status(400).json({ error: "Fornisci almeno 'name' o 'email'." })
    }

    try {
        const user = await User.findByPk(userId)

        if (!user) {
            return res.status(404).json({ error: "Utente da aggiornare inesistente" })
        }

        // Solo se ci sono cambiamenti reali
        if (name) user.name = name
        if (email) user.email = email

        await user.save()

        const updatedUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt?.toISOString()
        }

        const payload = JSON.stringify(updatedUser)
        // Aggiorna cache Redis
        await redis.set(`user:${user.id}`, payload)
        console.log(`✅ [UserService] Cache aggiornata per user:${user.id}`)

        // Pubblica evento

        await redis.publish("user-aggiornato", payload)
        console.log(`📢 [UserService] Evento 'user-aggiornato' pubblicato`)

        return res.status(200).json({
            message: "Profilo aggiornato con successo",
            user: updatedUser
        })
    } catch (err) {
        console.error("❌ [UserService] Errore aggiornamento profilo:", err)
        return res.status(500).json({ error: "Errore server" })
    }
}

// -----------User profile per Admin access (dati del profilo visto da admin)

export const userProfile_ByAdmin = async (request, response) => {
    try {
        const userId = request.params.id
        const user = await User.findByPk(userId, {
            attributes: ["id", "name", "email", "createdAt"]
        })
        if (!user) return response.status(404).json({ error: "Utente non trovato" })

        return response.json({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt.toISOString(),
            isAdmin: user.isAdmin
        })
    } catch (error) {
        console.error("Errore nel recupero del profilo")
        return response.status(500).json({ error: "Errore server" })
    }
}

export const usersList_ByAdmin = async (request, response) => {
    try {
        const users = await User.findAll({
            attributes: ["id", "name", "email", "isAdmin", "createdAt"]
        })
        return response.json(users)
    } catch (error) {
        console.error("Errore nel recupero della lista utenti", error)
        return response.status(500).json({ error: "Errore server" })
    }
}
