// Carga las 15 preguntas fijas de la evaluacion de cada modulo.
// Uso: node db/seed-preguntas.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../lib/db');

const RIESGOS = [
  { tipo: 'seleccion', enunciado: '¿Cuál es la definición institucional de riesgo?', opciones: ['Probabilidad de ocurrencia de eventos que impacten negativamente los objetivos, la situación financiera o la reputación de la organización.', 'Cualquier pérdida financiera ya confirmada por auditoría.', 'Un evento que ya ocurrió y generó pérdidas económicas.'], correcta: 0, explicacion: 'Es la definición institucional presentada en la Lección 1: probabilidad de ocurrencia de eventos que impacten negativamente los objetivos, la situación financiera o la reputación.', fuente: 'L1 · Fundamentos de GIR', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: '¿Cuál es el orden correcto del proceso de gestión de riesgos?', opciones: ['Medir, Identificar, Monitorear, Controlar', 'Identificar, Medir, Controlar, Monitorear', 'Controlar, Monitorear, Identificar, Medir'], correcta: 1, explicacion: 'El proceso sigue el orden: Identificar → Medir → Controlar → Monitorear.', fuente: 'L1 · Fundamentos de GIR', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: '¿Qué norma corresponde a "Normas técnicas para la gestión integral de riesgos de las entidades financieras"?', opciones: ['NRP-20', 'NRP-42', 'NCB-022'], correcta: 0, explicacion: 'NRP-20 son las Normas técnicas para la gestión integral de riesgos de las entidades financieras.', fuente: 'L1 · Marco regulatorio', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: 'Según la definición de Basilea II, el riesgo operacional resulta de fallas en:', opciones: ['Únicamente los sistemas tecnológicos', 'Procesos, personas, sistemas internos o eventos externos', 'Únicamente el desempeño del personal'], correcta: 1, explicacion: 'Basilea II define el riesgo operacional como pérdida por falta de adecuación o fallo en procesos, personal, sistemas internos, o eventos externos.', fuente: 'L2 · Riesgo Operacional', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: '¿Cuál línea de defensa es responsable de auditar que los controles sean efectivos?', opciones: ['Primera línea', 'Segunda línea', 'Tercera línea'], correcta: 2, explicacion: 'La tercera línea (Auditoría) evalúa de forma independiente que los procesos y controles sean efectivos.', fuente: 'L2 · Riesgo Operacional', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: 'Un tercero que falsifica documentos de identidad para hacerse pasar por un asociado comete:', opciones: ['Fraude interno', 'Fraude externo', 'Ciberfraude'], correcta: 1, explicacion: 'Es fraude externo: cometido por una persona ajena a la organización, como la falsificación de documentos o suplantación de identidad.', fuente: 'L3 · Riesgo de Fraude', dificultad: 'basico' },
  { tipo: 'verdadero_falso', enunciado: 'Reportar una operación sospechosa requiere tener pruebas contundentes antes de informar.', opciones: ['Verdadero', 'Falso'], correcta: 1, explicacion: 'No se necesitan pruebas, solo sospechas fundadas — no hay que esperar certeza absoluta para reportar.', fuente: 'L3 · Riesgo de Fraude', dificultad: 'basico' },
  { tipo: 'caso', enunciado: 'En el caso "Otorgamiento de crédito" visto en la Lección 3, ¿qué señal de alerta estuvo presente?', opciones: ['Un empleado que nunca toma vacaciones', 'Presión del solicitante para agilizar el trámite por urgencia', 'Múltiples transacciones fraccionadas'], correcta: 1, explicacion: 'El solicitante manifestó urgencia porque la vivienda se vendería a otro comprador — presión para agilizar el trámite, una señal de alerta externa.', fuente: 'L3 · Caso práctico "Otorgamiento de crédito"', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: 'Ante presiones para omitir controles o para aprobar una operación "de favor", ¿qué acción de tu rol en la prevención del fraude corresponde aplicar?', opciones: ['Reporta', 'Cuestiona', 'Protege'], correcta: 1, explicacion: '"Cuestiona": ante presiones para omitir pasos o aprobar de favor, debes escalar a tu supervisor inmediatamente.', fuente: 'L3 · Tu rol en la prevención del fraude', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: '¿Cuál es la primera etapa en la gestión de una crisis reputacional?', opciones: ['Comunicación', 'Detección', 'Contención'], correcta: 1, explicacion: 'La primera etapa es Detección: identificar el evento adverso de forma temprana y activar el comité de crisis.', fuente: 'L4 · Riesgo Reputacional', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Según la política de contraseñas, ¿cada cuántos días se debe cambiar como mínimo?', opciones: ['30 días', '90 días', '180 días'], correcta: 1, explicacion: 'La política establece cambiar la contraseña cada 90 días como máximo.', fuente: 'L5 · Protección de Información', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Los expedientes de crédito de los asociados se clasifican como información:', opciones: ['Pública', 'Interna', 'Confidencial'], correcta: 2, explicacion: 'Los expedientes de crédito son un ejemplo explícito de información confidencial.', fuente: 'L5 · Protección de Información', dificultad: 'basico' },
  { tipo: 'verdadero_falso', enunciado: 'Es correcto conectar un USB personal a la computadora de trabajo para pasar archivos.', opciones: ['Verdadero', 'Falso'], correcta: 1, explicacion: 'No debe conectarse USB personales a equipos institucionales, según la política de escritorios limpios.', fuente: 'L5 · Protección de Información', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Un ciberataque que interrumpe la operación normal de la Cooperativa es un ejemplo de:', opciones: ['Continuidad', 'Contingencia', 'Recuperación'], correcta: 1, explicacion: 'La contingencia es el evento imprevisto que interrumpe el funcionamiento normal, como un ciberataque.', fuente: 'L6 · Continuidad de Negocio', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: '¿Qué normativa rige el sistema de gestión de continuidad de negocio de ACACES?', opciones: ['ISO 22301 / NRP-24', 'NRP-20', 'Basilea II'], correcta: 0, explicacion: 'La continuidad de negocio se rige por ISO 22301 y la norma NRP-24.', fuente: 'L6 · Continuidad de Negocio', dificultad: 'intermedio' },
];

const LAFT_ADMIN = [
  { tipo: 'seleccion', enunciado: '¿Cuál es la primera etapa del Lavado de Activos?', opciones: ['Estratificación', 'Colocación', 'Integración'], correcta: 1, explicacion: 'La primera etapa es la Colocación: introducción de ganancias ilícitas en el sistema financiero.', fuente: 'L1 · Conceptos fundamentales', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'La etapa "Adquisición y envío de bienes y tecnología" corresponde a las etapas de:', opciones: ['Financiamiento del Terrorismo', 'Financiación de la Proliferación', 'Lavado de Activos'], correcta: 1, explicacion: 'Es la tercera etapa de la Financiación de la Proliferación (fuente: J. Brewer, CNAS 2018).', fuente: 'L1 · Conceptos fundamentales', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: '¿Cuál de los siguientes es un ejemplo de la etapa de Integración del lavado de activos?', opciones: ['Depósitos bancarios en efectivo', 'Transferencias bancarias', 'Red de empresas de fachada'], correcta: 2, explicacion: 'La red de empresas de fachada es el ejemplo dado para la etapa de Integración.', fuente: 'L1 · Conceptos fundamentales', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: '¿Qué norma establece los requisitos que debe cumplir el Oficial de Cumplimiento?', opciones: ['Ley Contra Actos de Terrorismo', 'Instructivo de la UIF para la Prevención del LDA', 'Reglamento de la Ley Contra Lavado de Dinero y Activos'], correcta: 1, explicacion: 'El Instructivo de la UIF desarrolla el detalle operativo y los requisitos de los Oficiales de Cumplimiento.', fuente: 'L2 · Marco regulatorio', dificultad: 'basico' },
  { tipo: 'verdadero_falso', enunciado: 'La posición de garante solo aplica si la persona actuó con intención de causar daño.', opciones: ['Verdadero', 'Falso'], correcta: 1, explicacion: 'Existe posición de garante cuando la persona tiene la obligación de actuar y no lo hace, pudiendo y debiendo hacerlo — no requiere intención de dañar.', fuente: 'L2 · Posición de Garante', dificultad: 'avanzado' },
  { tipo: 'seleccion', enunciado: '¿Cuál política es considerada "la piedra angular de todo el sistema de prevención"?', opciones: ['Conoce a tu Directivo', 'Conoce a tu Asociado', 'Conoce a tu Proveedor'], correcta: 1, explicacion: 'La debida diligencia de la Política Conoce a tu Asociado es la piedra angular de todo el sistema de prevención.', fuente: 'L3 · Las 4 políticas internas', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Un asociado con baja exposición al riesgo de LA/FT/FPADM recibe debida diligencia:', opciones: ['Intensificada', 'Simplificada', 'Estándar'], correcta: 1, explicacion: 'La debida diligencia simplificada se aplica cuando se identifica baja exposición al riesgo.', fuente: 'L4 · Conoce a tu Asociado', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Un ex funcionario de gobierno de alta jerarquía se clasifica como:', opciones: ['APNFD', 'Persona Expuesta Políticamente (PEP)', 'Alto riesgo por actividad económica'], correcta: 1, explicacion: 'Los funcionarios gubernamentales de alta jerarquía, actuales o pasados, se clasifican como PEP.', fuente: 'L4 · Conoce a tu Asociado', dificultad: 'basico' },
  { tipo: 'verdadero_falso', enunciado: 'Un empleado que se niega a tomar vacaciones es una señal de alerta.', opciones: ['Verdadero', 'Falso'], correcta: 0, explicacion: 'Negarse a tomar vacaciones está explícitamente listado como señal de alerta de empleados.', fuente: 'L5 · Conoce a tu Empleado', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: '¿Quién aprueba el plan de capacitaciones anuales en materia de LA/FT/FPADM?', opciones: ['Únicamente el Oficial de Cumplimiento', 'El Consejo de Administración', 'Recursos Humanos'], correcta: 1, explicacion: 'El plan lo elabora e imparte el Oficial de Cumplimiento, pero lo aprueba el Consejo de Administración anualmente.', fuente: 'L5 · Conoce a tu Empleado', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: '¿Quién valida en listas de cautela a los candidatos a directivos antes de su elección?', opciones: ['Recursos Humanos', 'La Oficialía de Cumplimiento', 'La Gerencia Legal'], correcta: 1, explicacion: 'La Oficialía de Cumplimiento realiza esa validación e informa el resultado al Consejo de Administración y Junta de Vigilancia.', fuente: 'L6 · Conoce a tu Directivo', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Un proveedor contratado para un proyecto específico de 6 meses es de tipo:', opciones: ['Eventual', 'Temporal', 'Permanente'], correcta: 1, explicacion: 'Es temporal: contratado por un período o proyecto determinado que no excede los 12 meses.', fuente: 'L7 · Conoce a tu Proveedor', dificultad: 'basico' },
  { tipo: 'seleccion', enunciado: 'Si un proveedor aparece en las listas OFAC, ONU o LECAT, se debe:', opciones: ['Aplicar debida diligencia intensificada y continuar', 'Finalizar la relación comercial o el proceso de compra', 'Notificar solo si el monto de la operación es alto'], correcta: 1, explicacion: 'Ante coincidencias negativas en esas listas, se da por finalizada la relación comercial o el proceso de compra.', fuente: 'L7 · Conoce a tu Proveedor', dificultad: 'intermedio' },
  { tipo: 'seleccion', enunciado: '¿Por cuántos años debe archivar la Gerencia Financiera la documentación de las operaciones?', opciones: ['5 años', '10 años', '15 años'], correcta: 2, explicacion: 'La Gerencia Financiera debe archivar y conservar la documentación por un plazo no menor a quince años.', fuente: 'L8 · Responsabilidades por área', dificultad: 'basico' },
  { tipo: 'verdadero_falso', enunciado: 'El reporte de una operación inusual requiere el visto bueno del jefe inmediato antes de enviarse a la Oficialía de Cumplimiento.', opciones: ['Verdadero', 'Falso'], correcta: 1, explicacion: 'El reporte no requiere validación ni visto bueno del jefe inmediato — es una comunicación directa con la Oficialía de Cumplimiento.', fuente: 'L9 · Operaciones inusuales', dificultad: 'basico' },
];

async function cargarPreguntas(modulo, segmento, preguntas) {
  const params = [modulo];
  let sql = 'select id from ediciones where modulo=$1 and anio=2026';
  if (segmento) { sql += ' and segmento_objetivo=$2'; params.push(segmento); }
  else { sql += ' and segmento_objetivo is null'; }
  const { rows } = await db.query(sql, params);
  const edicionId = rows[0] && rows[0].id;
  if (!edicionId) throw new Error(`No existe edicion ${modulo}/${segmento || 'general'}`);

  await db.query('delete from preguntas where edicion_id=$1', [edicionId]);
  let orden = 1;
  for (const p of preguntas) {
    await db.query(
      `insert into preguntas (edicion_id, orden, tipo, enunciado, opciones, respuesta_correcta, explicacion, fuente, dificultad)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [edicionId, orden, p.tipo, p.enunciado, JSON.stringify(p.opciones), p.correcta, p.explicacion, p.fuente, p.dificultad]
    );
    orden++;
  }
  console.log(`${preguntas.length} preguntas cargadas para ${modulo}/${segmento || 'general'}`);
}

(async () => {
  await cargarPreguntas('riesgos', null, RIESGOS);
  await cargarPreguntas('laft', 'administrativo', LAFT_ADMIN);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
