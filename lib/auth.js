// Autenticacion: hash de contraseñas (bcryptjs) + sesion firmada (JWT en
// cookie httpOnly). Nada de contraseñas en texto plano, nada de sesiones
// sin firmar.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.warn('[auth] SESSION_SECRET no esta configurada. Definela en .env (ver .env.example).');
}

const COOKIE_NAME = 'acaces_sesion';
const EXPIRES_IN = '12h';
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}
function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

// Contraseña temporal legible, sin caracteres ambiguos (0/O, 1/l/I).
function generarPasswordTemporal() {
  const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) out += alfabeto[bytes[i] % alfabeto.length];
  return out;
}

function issueToken(usuario) {
  return jwt.sign(
    { uid: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch (e) { return null; }
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Middleware: parsea la cabecera Cookie manualmente (sin dependencia extra).
function cookieParser(req, res, next) {
  const header = req.headers.cookie || '';
  req.cookies = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) req.cookies[key] = decodeURIComponent(val);
  });
  next();
}

function readSession(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  return verifyToken(token);
}

// Middleware: exige sesion valida para rutas /api/*.
function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'No autenticado' });
  req.session = session;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.session.rol !== 'administrador') {
      return res.status(403).json({ error: 'Requiere rol administrador' });
    }
    next();
  });
}

module.exports = {
  hashPassword, verifyPassword, generarPasswordTemporal,
  issueToken, verifyToken, setSessionCookie, clearSessionCookie,
  cookieParser, readSession, requireAuth, requireAdmin,
  COOKIE_NAME,
};
