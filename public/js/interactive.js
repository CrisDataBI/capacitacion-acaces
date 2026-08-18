// Motor generico de componentes interactivos para las lecciones.
// Cada componente se declara en el HTML via data-component y este
// archivo lo activa al cargar la pagina. Sin dependencias externas.

(function () {
  'use strict';

  function shake(el) {
    el.classList.add('is-wrong');
    setTimeout(() => el.classList.remove('is-wrong'), 300);
  }

  /* ---------------- Tarjetas (flip) ---------------- */
  function initFlipCards(root) {
    root.querySelectorAll('.flip-card').forEach((card) => {
      card.addEventListener('click', () => card.classList.toggle('is-flipped'));
    });
  }

  /* ---------------- Clasificar ---------------- */
  function initClassify(root) {
    let selected = null;

    function clearSelection() {
      if (selected) selected.classList.remove('is-selected');
      selected = null;
    }

    root.querySelectorAll('.classify-item').forEach((item) => {
      item.addEventListener('click', () => {
        if (item.closest('.zone-drop')) return; // ya colocado
        if (selected === item) { clearSelection(); return; }
        clearSelection();
        selected = item;
        item.classList.add('is-selected');
      });
    });

    root.querySelectorAll('.classify-zone').forEach((zone) => {
      zone.addEventListener('click', () => {
        if (!selected) return;
        const ok = selected.dataset.answer === zone.dataset.zone;
        if (ok) {
          selected.classList.remove('is-selected');
          selected.classList.add('is-correct');
          zone.querySelector('.zone-drop').appendChild(selected);
          selected = null;
          checkClassifyDone(root);
        } else {
          shake(zone);
          shake(selected);
          clearSelection();
        }
      });
    });
  }

  function checkClassifyDone(root) {
    const bank = root.querySelector('.classify-bank');
    if (bank && bank.children.length === 0) {
      showBanner(root, 'good', 'Completado — todas las tarjetas están en la categoría correcta.');
    }
  }

  /* ---------------- Ordenar pasos ---------------- */
  function initSequence(root) {
    const list = root.querySelector('.sequence');
    const order = (root.dataset.order || '').split(',').map((s) => s.trim());

    function renumber() {
      [...list.children].forEach((li, i) => {
        li.querySelector('.seq-num').textContent = (i + 1) + '.';
        li.classList.remove('is-correct', 'is-incorrect');
      });
    }
    renumber();

    list.querySelectorAll('[data-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const li = btn.closest('li');
        const dir = btn.dataset.dir;
        if (dir === 'up' && li.previousElementSibling) {
          list.insertBefore(li, li.previousElementSibling);
        } else if (dir === 'down' && li.nextElementSibling) {
          list.insertBefore(li.nextElementSibling, li);
        }
        renumber();
      });
    });

    const checkBtn = root.querySelector('.sequence-check');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        let correctCount = 0;
        [...list.children].forEach((li, i) => {
          const ok = li.dataset.key === order[i];
          li.classList.toggle('is-correct', ok);
          li.classList.toggle('is-incorrect', !ok);
          if (ok) correctCount++;
        });
        const total = order.length;
        if (correctCount === total) {
          showBanner(root, 'good', `¡Orden correcto! ${correctCount}/${total}.`);
        } else {
          showBanner(root, 'warn', `${correctCount}/${total} en la posición correcta — ajusta las que están en rojo y vuelve a verificar.`);
        }
      });
    }
  }

  /* ---------------- Relacionar (match) ---------------- */
  function initMatch(root) {
    let selLeft = null, selRight = null;

    function evaluate() {
      if (!selLeft || !selRight) return;
      if (selLeft.dataset.key === selRight.dataset.key) {
        selLeft.classList.add('is-matched');
        selRight.classList.add('is-matched');
        selLeft.classList.remove('is-selected');
        selRight.classList.remove('is-selected');
        selLeft.disabled = true;
        selRight.disabled = true;
        const remaining = root.querySelectorAll('.match-item:not(.is-matched)').length;
        if (remaining === 0) showBanner(root, 'good', 'Completado — todas las parejas están correctas.');
      } else {
        shake(selLeft);
        shake(selRight);
        selLeft.classList.remove('is-selected');
        selRight.classList.remove('is-selected');
      }
      selLeft = null; selRight = null;
    }

    root.querySelectorAll('.match-left .match-item').forEach((item) => {
      item.addEventListener('click', () => {
        if (item.classList.contains('is-matched')) return;
        if (selLeft) selLeft.classList.remove('is-selected');
        selLeft = item;
        item.classList.add('is-selected');
        evaluate();
      });
    });
    root.querySelectorAll('.match-right .match-item').forEach((item) => {
      item.addEventListener('click', () => {
        if (item.classList.contains('is-matched')) return;
        if (selRight) selRight.classList.remove('is-selected');
        selRight = item;
        item.classList.add('is-selected');
        evaluate();
      });
    });
  }

  /* ---------------- Matriz probabilidad x impacto ---------------- */
  function initRiskScale(root) {
    const state = {};
    root.querySelectorAll('.scale-axis').forEach((axis) => {
      const key = axis.dataset.axis;
      axis.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          axis.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          state[key] = Number(btn.dataset.value);
          updateResult();
        });
      });
    });
    function updateResult() {
      const badge = root.querySelector('.scale-result-badge');
      if (state.probabilidad == null || state.impacto == null) return;
      const score = state.probabilidad * state.impacto;
      let level, label;
      if (score <= 4) { level = 'bajo'; label = 'Riesgo bajo'; }
      else if (score <= 10) { level = 'moderado'; label = 'Riesgo moderado'; }
      else if (score <= 16) { level = 'alto'; label = 'Riesgo alto'; }
      else { level = 'critico'; label = 'Riesgo crítico'; }
      badge.dataset.level = level;
      badge.textContent = `${label} (puntaje ${score}/25)`;
    }
  }

  /* ---------------- Checklist verdadero/falso ---------------- */
  function initChecklist(root) {
    root.querySelectorAll('.check-row').forEach((row) => {
      row.querySelectorAll('.check-actions button').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (row.classList.contains('is-answered')) return;
          const ok = btn.dataset.value === row.dataset.answer;
          btn.classList.add('is-picked', ok ? 'is-correct' : 'is-incorrect');
          row.classList.add('is-answered');
        });
      });
    });
  }

  /* ---------------- Quiz ---------------- */
  function initQuiz(root) {
    const options = root.querySelectorAll('.quiz-options button');
    const feedback = root.querySelector('.quiz-feedback');
    options.forEach((btn) => {
      btn.addEventListener('click', () => {
        options.forEach((b) => (b.disabled = true));
        const correct = btn.dataset.correct === 'true';
        btn.classList.add(correct ? 'is-correct' : 'is-incorrect');
        if (!correct) {
          const rightBtn = [...options].find((b) => b.dataset.correct === 'true');
          if (rightBtn) rightBtn.classList.add('is-correct');
        }
        if (feedback) feedback.hidden = false;
      });
    });
  }

  /* ---------------- Banner de retroalimentacion ---------------- */
  function showBanner(root, type, text) {
    let banner = root.querySelector('.feedback-banner');
    if (!banner) {
      banner = document.createElement('p');
      banner.className = 'feedback-banner';
      root.appendChild(banner);
    }
    banner.className = 'feedback-banner ' + type;
    banner.textContent = text;
    banner.hidden = false;
  }

  /* ---------------- Inicializacion ---------------- */
  const INIT = {
    'flip-cards': initFlipCards,
    'classify': initClassify,
    'sequence': initSequence,
    'match': initMatch,
    'risk-scale': initRiskScale,
    'checklist': initChecklist,
    'quiz': initQuiz,
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-component]').forEach((el) => {
      const type = el.dataset.component;
      if (INIT[type]) INIT[type](el);
    });
  });
})();
