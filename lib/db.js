// Conexion a Postgres (Supabase). Toda la configuracion sensible viene de
// variables de entorno - nunca hardcodeada en el codigo.
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[db] DATABASE_URL no esta configurada. Definela en .env (ver .env.example).');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
