// Genera nuevas contraseñas temporales para todos los colaboradores (rol != administrador)
// y las actualiza en la base de datos.
// Uso: node db/reset-passwords.js > passwords.csv
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../lib/db');
const { hashPassword, generarPasswordTemporal } = require('../lib/auth');

(async () => {
  const { rows } = await db.query(
    `SELECT id, nombre, correo, segmento FROM usuarios WHERE rol != 'administrador' ORDER BY nombre`
  );

  console.log('nombre,correo,segmento,password_temporal');

  for (const u of rows) {
    const pwd = generarPasswordTemporal();
    const hash = hashPassword(pwd);
    await db.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hash, u.id]);
    console.log(`"${u.nombre}","${u.correo}","${u.segmento || ''}","${pwd}"`);
  }

  console.error(`\n${rows.length} contraseñas actualizadas.`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
