// Crea (o actualiza) cuentas demo para revisar ambas pistas.
// node db/seed-demo.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../lib/db');
const auth = require('../lib/auth');

async function upsertDemo(nombre, usuario, password, segmento) {
  const hash = auth.hashPassword(password);
  await db.query(
    `insert into usuarios (nombre, usuario, correo, password_hash, rol, segmento, debe_cambiar_password)
     values ($1,$2,$3,$4,'empleado',$5,false)
     on conflict (usuario) do update
       set password_hash = excluded.password_hash,
           segmento = excluded.segmento,
           activo = true,
           debe_cambiar_password = false`,
    [nombre, usuario, usuario, hash, segmento]
  );
  console.log(`Demo listo: ${usuario} / ${password}  (segmento: ${segmento})`);
}

async function main() {
  await upsertDemo('Demo Administrativo', 'demo.administrativo@acaces.com.sv', 'Demo2026!', 'administrativo');
  await upsertDemo('Demo Negocios',       'demo.negocios@acaces.com.sv',       'Demo2026!', 'negocios');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
