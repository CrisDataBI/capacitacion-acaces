-- Capacitacion Anual ACACES - esquema de base de datos (Supabase / Postgres)
-- Ejecutar completo en el SQL editor de Supabase (Project > SQL Editor > New query).
-- Cubre: identidad, inscripcion al Modulo 1, progreso por leccion y trazabilidad.
-- La evaluacion final (banco de preguntas, intentos, calificaciones) se agrega
-- en una migracion aparte cuando llegue el banco de preguntas existente.

create extension if not exists pgcrypto;

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cargo text,
  area text,
  correo text unique,
  usuario text not null unique,       -- login: correo si existe, o codigo de empleado/DUI si no
  password_hash text not null,
  rol text not null default 'empleado' check (rol in ('empleado','administrador','auditor')),
  activo boolean not null default true,
  debe_cambiar_password boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists ediciones (
  id uuid primary key default gen_random_uuid(),
  modulo text not null check (modulo in ('riesgos','laft')),
  anio int not null,
  estado text not null default 'publicado' check (estado in ('borrador','publicado')),
  nota_minima int not null default 80,
  dias_plazo int not null default 15,
  intentos_permitidos int not null default 2,
  unique (modulo, anio)
);

create table if not exists inscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  edicion_id uuid not null references ediciones(id) on delete cascade,
  fecha_inscripcion timestamptz not null default now(),
  fecha_inicio timestamptz,
  fecha_limite timestamptz,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','en_progreso','evaluacion_pendiente','aprobado','reprobado','vencido')),
  unique (usuario_id, edicion_id)
);

create table if not exists progreso_leccion (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references inscripciones(id) on delete cascade,
  leccion_key text not null,          -- l1..l6, cierre
  completado_en timestamptz not null default now(),
  unique (inscripcion_id, leccion_key)
);

create table if not exists eventos_trazabilidad (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id) on delete set null,
  tipo_evento text not null,          -- inscripcion, inicio, progreso, login, etc.
  detalle jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_inscripciones_usuario on inscripciones(usuario_id);
create index if not exists idx_progreso_inscripcion on progreso_leccion(inscripcion_id);
create index if not exists idx_eventos_usuario on eventos_trazabilidad(usuario_id);

-- Edicion 2026 del Modulo 1 (Gestion de Riesgos), con los valores confirmados en Fase 1.
insert into ediciones (modulo, anio, estado, nota_minima, dias_plazo, intentos_permitidos)
values ('riesgos', 2026, 'publicado', 80, 15, 2)
on conflict (modulo, anio) do nothing;
