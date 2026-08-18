// Parser/serializador CSV minimo (soporta comillas), sin dependencias.

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') pushField();
    else if (c === '\n') pushRow();
    else if (c === '\r') { /* ignorar */ }
    else field += c;
  }
  if (field !== '' || row.length) pushRow();
  return rows.filter((r) => r.length && r.some((c) => c.trim() !== ''));
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
    return obj;
  });
}

function toCSV(headerArr, rowsArr) {
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headerArr.map(esc).join(',')];
  rowsArr.forEach((r) => lines.push(r.map(esc).join(',')));
  return lines.join('\r\n');
}

module.exports = { parseCSV, rowsToObjects, toCSV };
