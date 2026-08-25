// Busca a yzelaya por correo y eleva su rol a administrador (independiente del campo usuario)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../lib/db');

async function main() {
  // Ver todas las filas que coincidan con yzelaya
  const { rows } = await db.query(
    `SELECT id, nombre, usuario, correo, rol, activo, segmento
     FROM usuarios
     WHERE correo ILIKE '%yzelaya%' OR usuario ILIKE '%yzelaya%'
     ORDER BY id`
  );
  console.log('Cuentas encontradas:', rows);

  if (rows.length === 0) { console.log('No se encontró ninguna cuenta.'); process.exit(1); }

  // Elevar TODAS las filas encontradas a administrador (si hay duplicadas, las consolida)
  for (const u of rows) {
    await db.query(
      `UPDATE usuarios SET rol = 'administrador', activo = true, debe_cambiar_password = true WHERE id = $1`,
      [u.id]
    );
    console.log(`✓ ${u.nombre} (${u.correo || u.usuario}) → rol actualizado a administrador`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
