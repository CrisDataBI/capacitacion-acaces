const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const db = require('./lib/db');
const auth = require('./lib/auth');
const { parseCSV, rowsToObjects, toCSV } = require('./lib/csv');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const LECCIONES_VALIDAS = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'cierre'];
const MODULOS_VALIDOS = ['riesgos', 'laft'];
const SEGMENTOS_VALIDOS = ['negocios', 'administrativo'];

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(auth.cookieParser);

/* ============================================================
   API - autenticacion
   ============================================================ */

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) return res.status(400).json({ error: 'Falta usuario o contraseña' });

    const { rows } = await db.query(
      'select * from usuarios where usuario = $1 and activo = true',
      [String(usuario).trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !auth.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = auth.issueToken(user);
    auth.setSessionCookie(res, token);
    await db.query('insert into eventos_trazabilidad (usuario_id, tipo_evento) values ($1, $2)', [user.id, 'login']);
    res.json({ ok: true, rol: user.rol, debeCambiarPassword: user.debe_cambiar_password });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.post('/api/cambiar-password', auth.requireAuth, async (req, res) => {
  try {
    const { actual, nueva } = req.body || {};
    if (!nueva || nueva.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    const { rows } = await db.query('select * from usuarios where id = $1', [req.session.uid]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!user.debe_cambiar_password) {
      if (!actual || !auth.verifyPassword(actual, user.password_hash)) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }
    }
    const hash = auth.hashPassword(nueva);
    await db.query('update usuarios set password_hash = $1, debe_cambiar_password = false where id = $2', [hash, user.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ============================================================
   API - progreso del empleado (Modulo 1 y Modulo 2, edicion 2026)
   ============================================================ */

function leerModuloSegmento(req, usuarioSegmento) {
  const modulo = MODULOS_VALIDOS.includes(req.query.modulo) ? req.query.modulo : 'riesgos';
  let segmento = null;
  if (modulo === 'laft') {
    segmento = SEGMENTOS_VALIDOS.includes(req.query.segmento) ? req.query.segmento : usuarioSegmento;
  }
  return { modulo, segmento };
}

async function obtenerOCrearInscripcion(usuarioId, modulo, segmento) {
  const params = [modulo];
  let sql = 'select * from ediciones where modulo=$1 and anio=2026';
  if (segmento) { sql += ' and segmento_objetivo=$2'; params.push(segmento); }
  else { sql += ' and segmento_objetivo is null'; }
  const { rows: ed } = await db.query(sql, params);
  const edicion = ed[0];
  if (!edicion) throw new Error(`No existe la edicion ${modulo}${segmento ? '/' + segmento : ''}-2026. Corre las migraciones en Supabase.`);

  const { rows: existente } = await db.query(
    'select * from inscripciones where usuario_id=$1 and edicion_id=$2',
    [usuarioId, edicion.id]
  );
  if (existente[0]) return { inscripcion: existente[0], edicion };

  const fechaLimite = new Date(Date.now() + edicion.dias_plazo * 86400000);
  const { rows: nueva } = await db.query(
    `insert into inscripciones (usuario_id, edicion_id, fecha_inicio, fecha_limite, estado)
     values ($1,$2, now(), $3, 'en_progreso') returning *`,
    [usuarioId, edicion.id, fechaLimite]
  );
  await db.query(
    'insert into eventos_trazabilidad (usuario_id, tipo_evento, detalle) values ($1,$2,$3)',
    [usuarioId, 'inscripcion', JSON.stringify({ edicion: `${modulo}${segmento ? '-' + segmento : ''}-2026` })]
  );
  return { inscripcion: nueva[0], edicion };
}

app.get('/api/me', auth.requireAuth, async (req, res) => {
  try {
    const uid = req.session.uid;
    const { rows: urows } = await db.query(
      'select id, nombre, cargo, area, rol, segmento, debe_cambiar_password from usuarios where id=$1',
      [uid]
    );
    const user = urows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { modulo, segmento } = leerModuloSegmento(req, user.segmento);
    const { inscripcion } = await obtenerOCrearInscripcion(uid, modulo, segmento);

    const { rows: prog } = await db.query(
      'select leccion_key from progreso_leccion where inscripcion_id=$1',
      [inscripcion.id]
    );
    const progreso = {};
    prog.forEach((p) => { progreso[p.leccion_key] = true; });

    const msRestante = new Date(inscripcion.fecha_limite).getTime() - Date.now();
    const diasRestantes = Math.max(0, Math.ceil(msRestante / 86400000));

    let estado = inscripcion.estado;
    if (!['aprobado', 'reprobado', 'vencido'].includes(estado) && msRestante <= 0) {
      estado = 'vencido';
      await db.query('update inscripciones set estado=$1 where id=$2', [estado, inscripcion.id]);
    }

    res.json({
      nombre: user.nombre,
      cargo: user.cargo,
      area: user.area,
      rol: user.rol,
      segmento: user.segmento,
      debeCambiarPassword: user.debe_cambiar_password,
      progreso,
      estado,
      fechaLimite: inscripcion.fecha_limite,
      diasRestantes,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/progreso/:leccion', auth.requireAuth, async (req, res) => {
  try {
    const leccion = req.params.leccion;
    if (!LECCIONES_VALIDAS.includes(leccion)) return res.status(400).json({ error: 'Lección inválida' });

    const uid = req.session.uid;
    const { rows: urows } = await db.query('select segmento from usuarios where id=$1', [uid]);
    const { modulo, segmento } = leerModuloSegmento(req, urows[0] && urows[0].segmento);
    const { inscripcion } = await obtenerOCrearInscripcion(uid, modulo, segmento);

    await db.query(
      `insert into progreso_leccion (inscripcion_id, leccion_key) values ($1,$2)
       on conflict (inscripcion_id, leccion_key) do nothing`,
      [inscripcion.id, leccion]
    );
    await db.query(
      'insert into eventos_trazabilidad (usuario_id, tipo_evento, detalle) values ($1,$2,$3)',
      [uid, 'progreso_leccion', JSON.stringify({ leccion })]
    );

    if (leccion === 'cierre' && inscripcion.estado === 'en_progreso') {
      await db.query("update inscripciones set estado='evaluacion_pendiente' where id=$1", [inscripcion.id]);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ============================================================
   API - administracion (Riesgos + Cumplimiento)
   ============================================================ */

app.get('/api/admin/usuarios', auth.requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      select u.id, u.nombre, u.cargo, u.area, u.correo, u.usuario, u.activo, u.segmento,
             i.estado, i.fecha_inscripcion, i.fecha_limite,
             coalesce((select count(*) from progreso_leccion pl where pl.inscripcion_id = i.id), 0) as lecciones_completadas,
             il.estado as laft_estado, il.fecha_limite as laft_fecha_limite,
             coalesce((select count(*) from progreso_leccion pl2 where pl2.inscripcion_id = il.id), 0) as laft_lecciones_completadas
      from usuarios u
      left join ediciones e on e.modulo = 'riesgos' and e.anio = 2026
      left join inscripciones i on i.usuario_id = u.id and i.edicion_id = e.id
      left join ediciones el on el.modulo = 'laft' and el.anio = 2026 and el.segmento_objetivo = u.segmento
      left join inscripciones il on il.usuario_id = u.id and il.edicion_id = el.id
      where u.rol = 'empleado'
      order by u.nombre
    `);
    res.json({ usuarios: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/usuarios/importar', auth.requireAdmin, async (req, res) => {
  try {
    const { csv } = req.body || {};
    if (!csv) return res.status(400).json({ error: 'Falta el CSV' });

    const filas = rowsToObjects(parseCSV(csv));
    const creados = [], actualizados = [], errores = [];

    for (const fila of filas) {
      const nombre = fila.nombre;
      const correo = (fila.correo || '').toLowerCase().trim();
      const identificador = (fila.identificador || '').trim().toLowerCase();
      const cargo = fila.cargo || '';
      const area = fila.area || '';
      const segmentoRaw = (fila.segmento || '').trim().toLowerCase();
      const segmento = ['negocios', 'administrativo'].includes(segmentoRaw) ? segmentoRaw : null;

      if (!nombre) { errores.push({ fila, motivo: 'Falta nombre' }); continue; }
      const usuarioLogin = correo || identificador;
      if (!usuarioLogin) { errores.push({ fila, motivo: 'Falta correo e identificador (uno de los dos es obligatorio)' }); continue; }
      if (segmentoRaw && !segmento) { errores.push({ fila, motivo: 'Segmento debe ser "negocios" o "administrativo"' }); continue; }

      const passwordTemporal = auth.generarPasswordTemporal();
      const hash = auth.hashPassword(passwordTemporal);
      try {
        const r = await db.query(
          `insert into usuarios (nombre, cargo, area, correo, usuario, password_hash, rol, segmento, debe_cambiar_password)
           values ($1,$2,$3,$4,$5,$6,'empleado', $7, true)
           on conflict (usuario) do update set nombre = excluded.nombre, cargo = excluded.cargo, area = excluded.area,
             segmento = coalesce(excluded.segmento, usuarios.segmento)
           returning (xmax = 0) as inserted`,
          [nombre, cargo, area, correo || null, usuarioLogin, hash, segmento]
        );
        if (r.rows[0].inserted) creados.push({ nombre, usuario: usuarioLogin, passwordTemporal });
        else actualizados.push({ nombre, usuario: usuarioLogin });
      } catch (err) {
        errores.push({ fila, motivo: err.message });
      }
    }
    res.json({ creados, actualizados, errores });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/admin/usuarios/:id/admin', auth.requireAdmin, async (req, res) => {
  try {
    await db.query("update usuarios set rol='administrador' where id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/admin/reportes.csv', auth.requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      select u.nombre, u.cargo, u.area, u.correo, u.usuario, u.segmento,
             i.estado, i.fecha_inscripcion, i.fecha_limite,
             coalesce((select count(*) from progreso_leccion pl where pl.inscripcion_id = i.id), 0) as lecciones_completadas,
             il.estado as laft_estado, il.fecha_limite as laft_fecha_limite,
             coalesce((select count(*) from progreso_leccion pl2 where pl2.inscripcion_id = il.id), 0) as laft_lecciones_completadas
      from usuarios u
      left join ediciones e on e.modulo = 'riesgos' and e.anio = 2026
      left join inscripciones i on i.usuario_id = u.id and i.edicion_id = e.id
      left join ediciones el on el.modulo = 'laft' and el.anio = 2026 and el.segmento_objetivo = u.segmento
      left join inscripciones il on il.usuario_id = u.id and il.edicion_id = el.id
      where u.rol = 'empleado'
      order by u.nombre
    `);
    const header = [
      'Nombre', 'Cargo', 'Área', 'Correo', 'Usuario', 'Segmento',
      'Estado Riesgos', 'Fecha inscripción Riesgos', 'Fecha límite Riesgos', 'Lecciones Riesgos (de 7)',
      'Estado LA/FT', 'Fecha límite LA/FT', 'Lecciones LA/FT (de 10)',
    ];
    const body = rows.map((r) => [
      r.nombre, r.cargo, r.area, r.correo, r.usuario, r.segmento || '',
      r.estado || 'pendiente',
      r.fecha_inscripcion ? new Date(r.fecha_inscripcion).toLocaleDateString('es-SV') : '',
      r.fecha_limite ? new Date(r.fecha_limite).toLocaleDateString('es-SV') : '',
      r.lecciones_completadas || 0,
      r.laft_estado || 'pendiente',
      r.laft_fecha_limite ? new Date(r.laft_fecha_limite).toLocaleDateString('es-SV') : '',
      r.laft_lecciones_completadas || 0,
    ]);
    const csv = toCSV(header, body);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-capacitacion-anual.csv"');
    res.send('﻿' + csv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

/* ============================================================
   Paginas estaticas + proteccion de rutas
   ============================================================ */

async function pageGuard(req, res, next) {
  try {
    const abiertas = ['/login.html', '/favicon.ico'];
    if (abiertas.includes(req.path) || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path.startsWith('/img')) {
      return next();
    }
    const session = auth.readSession(req);
    if (!session) return res.redirect('/login.html');

    if (req.path.startsWith('/admin') && session.rol !== 'administrador') {
      return res.status(403).send('<h1>403</h1><p>Esta sección es solo para administradores.</p>');
    }

    // Modulo 2 (LA/FT) tiene dos pistas separadas por segmento (Negocios /
    // Administrativo). Cada quien solo puede entrar a la suya.
    if (req.path.startsWith('/modulo-laft/negocios') || req.path.startsWith('/modulo-laft/administrativo')) {
      const rutaSegmento = req.path.startsWith('/modulo-laft/negocios') ? 'negocios' : 'administrativo';
      if (session.rol !== 'administrador') {
        const { rows } = await db.query('select segmento from usuarios where id=$1', [session.uid]);
        const segmentoUsuario = rows[0] && rows[0].segmento;
        if (!segmentoUsuario) {
          return res.status(403).send('<h1>403</h1><p>Tu cuenta todavía no tiene una pista de LA/FT asignada. Contacta al Área de Riesgos o a Cumplimiento.</p>');
        }
        if (segmentoUsuario !== rutaSegmento) {
          return res.redirect('/modulo-laft/' + segmentoUsuario + '/index.html');
        }
      }
    }

    next();
  } catch (e) {
    console.error(e);
    res.status(500).send('Error del servidor');
  }
}

app.use(pageGuard);
app.use(express.static(PUBLIC));

app.listen(PORT, () => {
  console.log(`Capacitación ACACES corriendo en http://localhost:${PORT}`);
});
