-- Migracion: soporte de "segmento" para el Modulo 2 (LA/FT), que Cumplimiento
-- divide en dos capacitaciones distintas: Negocios y Administrativo.
-- Ejecutar en el SQL editor de Supabase DESPUES de db/schema.sql.

alter table usuarios
  add column if not exists segmento text check (segmento in ('negocios', 'administrativo'));

alter table ediciones
  add column if not exists segmento_objetivo text check (segmento_objetivo in ('negocios', 'administrativo'));

-- La unicidad (modulo, anio) ya no alcanza: LA/FT 2026 va a tener dos filas
-- (una por segmento). Riesgos sigue con segmento_objetivo = null (aplica a todos).
alter table ediciones drop constraint if exists ediciones_modulo_anio_key;
alter table ediciones add constraint ediciones_modulo_anio_segmento_key unique (modulo, anio, segmento_objetivo);

-- Filas de LA/FT 2026 en borrador: se publican cuando llegue el material de cada pista.
insert into ediciones (modulo, anio, estado, nota_minima, dias_plazo, intentos_permitidos, segmento_objetivo)
values
  ('laft', 2026, 'borrador', 80, 15, 2, 'negocios'),
  ('laft', 2026, 'borrador', 80, 15, 2, 'administrativo')
on conflict (modulo, anio, segmento_objetivo) do nothing;

create index if not exists idx_usuarios_segmento on usuarios(segmento);
