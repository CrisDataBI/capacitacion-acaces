// Progreso real del empleado, contra el backend (Supabase vía la API).
// Reemplaza el prototipo anterior basado en localStorage.

(function () {
  'use strict';

  function injectAccountMenu(me) {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const box = document.createElement('div');
    box.style.cssText = 'display:flex; align-items:center; gap:0.8rem; font-family:var(--font-mono); font-size:0.78rem; color:rgba(255,255,255,0.85); position:relative; z-index:1;';
    box.innerHTML = `<span>${me ? 'Hola, ' + me.nombre.split(' ')[0] : ''}</span>` +
      '<button type="button" id="acaces-logout" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.35);border-radius:6px;padding:0.3rem 0.7rem;cursor:pointer;font:inherit;color:#fff;">Salir</button>';
    topbar.appendChild(box);
    document.getElementById('acaces-logout').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  const MODULO = document.body.dataset.modulo || 'riesgos';
  const SEGMENTO = document.body.dataset.segmento || '';
  const TOTAL_LECCIONES = { riesgos: 7, laft: 10 };
  const qs = 'modulo=' + MODULO + (SEGMENTO ? '&segmento=' + SEGMENTO : '');

  async function fetchMe() {
    const res = await fetch('/api/me?' + qs);
    if (res.status === 401) {
      window.location.href = '/login.html';
      return null;
    }
    if (!res.ok) return null;
    return res.json();
  }

  function applyProgressToDom(me) {
    const d = me.progreso || {};

    document.querySelectorAll('[data-user-name]').forEach((el) => { el.textContent = me.nombre.split(' ')[0]; });

    document.querySelectorAll('.progress-dots a[data-lesson]').forEach((dot) => {
      if (d[dot.dataset.lesson]) dot.classList.add('is-done');
    });

    const done = Object.keys(d).filter((k) => d[k]).length;
    const total = TOTAL_LECCIONES[MODULO] || 7;
    const percent = Math.round((done / total) * 100);

    document.querySelectorAll('[data-progress-percent]').forEach((el) => { el.textContent = percent + '%'; });
    document.querySelectorAll('[data-progress-bar]').forEach((el) => { el.style.width = percent + '%'; });

    document.querySelectorAll('[data-lesson-status]').forEach((el) => {
      const key = el.dataset.lessonStatus;
      el.textContent = d[key] ? 'Completada' : 'Pendiente';
      el.classList.toggle('good', !!d[key]);
      el.classList.toggle('neutral', !d[key]);
    });

    document.querySelectorAll('[data-dias-restantes]').forEach((el) => { el.textContent = me.diasRestantes; });
    document.querySelectorAll('[data-fecha-limite]').forEach((el) => {
      el.textContent = new Date(me.fechaLimite).toLocaleDateString('es-SV', { day: 'numeric', month: 'long', year: 'numeric' });
    });
    const ESTADOS = {
      pendiente: 'Pendiente', en_progreso: 'En progreso', evaluacion_pendiente: 'Evaluación pendiente',
      aprobado: 'Aprobado', reprobado: 'Reprobado', vencido: 'Vencido',
    };
    document.querySelectorAll('[data-estado]').forEach((el) => { el.textContent = ESTADOS[me.estado] || me.estado; });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const me = await fetchMe();
    if (!me) return;

    if (me.debeCambiarPassword && !location.pathname.endsWith('cambiar-password.html')) {
      window.location.href = '/cambiar-password.html';
      return;
    }

    injectAccountMenu(me);
    applyProgressToDom(me);

    const markBtn = document.querySelector('[data-mark-complete]');
    if (markBtn) {
      markBtn.addEventListener('click', async () => {
        markBtn.disabled = true;
        const leccion = markBtn.dataset.markComplete;
        const res = await fetch('/api/progreso/' + leccion + '?' + qs, { method: 'POST' });
        if (res.ok) {
          window.location.href = markBtn.dataset.next;
        } else {
          markBtn.disabled = false;
          alert('No se pudo guardar tu progreso. Intenta de nuevo.');
        }
      });
    }
  });
})();
