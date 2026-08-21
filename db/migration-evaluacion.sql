-- Migracion: motor de evaluacion (examen final de 15 preguntas fijas por edicion).
-- Ejecutar en el SQL editor de Supabase DESPUES de schema.sql y migration-segmento.sql.

create table if not exists preguntas (
  id uuid primary key default gen_random_uuid(),
  edicion_id uuid not null references ediciones(id) on delete cascade,
  orden int not null,
  tipo text not null default 'seleccion' check (tipo in ('seleccion', 'verdadero_falso', 'caso')),
  enunciado text not null,
  opciones jsonb not null,           -- array de strings
  respuesta_correcta int not null,   -- indice (0-based) dentro de "opciones"
  explicacion text not null,
  fuente text,                       -- leccion / lamina de origen
  dificultad text not null default 'basico' check (dificultad in ('basico', 'intermedio', 'avanzado')),
  unique (edicion_id, orden)
);

create table if not exists intentos_examen (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references inscripciones(id) on delete cascade,
  numero_intento int not null,
  respuestas jsonb not null,         -- { pregunta_id: opcion_elegida }
  calificacion numeric not null,     -- porcentaje 0-100
  aprobado boolean not null,
  creado_en timestamptz not null default now(),
  unique (inscripcion_id, numero_intento)
);

create index if not exists idx_preguntas_edicion on preguntas(edicion_id);
create index if not exists idx_intentos_inscripcion on intentos_examen(inscripcion_id);

-- La pista Administrativo de LA/FT ya tiene lecciones y examen construidos.
update ediciones set estado = 'publicado' where modulo = 'laft' and segmento_objetivo = 'administrativo' and anio = 2026;
