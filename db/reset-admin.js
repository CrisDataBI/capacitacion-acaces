const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../lib/db');
const { hashPassword, generarPasswordTemporal } = require('../lib/auth');

(async () => {
  const pwd = generarPasswordTemporal();
  const hash = hashPassword(pwd);
  await db.query('UPDATE usuarios SET password_hash=$1 WHERE correo=$2', [hash, 'cgarcia@acaces.com.sv']);
  console.log('Nueva contraseña admin:', pwd);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
