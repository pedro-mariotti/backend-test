const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log("Conectado ao PostgreSQL"))
  .catch(err => console.error("Erro ao conectar:", err));

module.exports = pool;