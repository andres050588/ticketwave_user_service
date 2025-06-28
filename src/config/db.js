import { Sequelize } from "sequelize"

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: "mysql",
    dialectOptions: {
        connectTimeout: 10000
    },
    logging: false
})

console.log("🔌 Connessione MySQL:", {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    db: process.env.DB_NAME
})

export default sequelize
