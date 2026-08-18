// Crea (o actualiza) un usuario administrador. Se corre una sola vez por
// persona administradora - ej. para dar de alta a Riesgos y a Cumplimiento.
//
// Uso:
//   node db/seed-admin.js "Nombre Completo" correo@acaces.com.sv unaContraseñaTemporal
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../lib/db');
const auth = require('../lib/auth');

async function main() {
  const [nombre, usuario, password] = process.argv.slice(2);
  if (!nombre || !usuario || !password) {
    console.log('Uso: node db/seed-admin.js "Nombre Completo" usuario@correo.com contraseñaTemporal');
    process.exit(1);
  }
  const hash = auth.hashPassword(password);
  await db.query(
    `insert into usuarios (nombre, usuario, correo, password_hash, rol, debe_cambiar_password)
     values ($1,$2,$3,$4,'administrador', true)
     on conflict (usuario) do update set password_hash = excluded.password_hash, rol = 'administrador', activo = true`,
    [nombre, usuario.toLowerCase().trim(), usuario.toLowerCase().trim(), hash]
  );
  console.log(`Administrador listo: ${usuario} (debe cambiar la contraseña al ingresar por primera vez)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
