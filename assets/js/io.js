/* ===== io.js — выгрузка и загрузка данных журнала (Excel / CSV) ===== */
const IO = (() => {

  // Построить матрицу журнала: [ ['№','ФИО', ...даты, 'Средний'], [строки...] ]
  function buildMatrix(gid, disc) {
    const g = Store.group(gid);
    const dates = Store.datesFor(gid, disc);
    const head = ['№', 'ФИО студента', ...dates.map(prettyDate), 'Средний балл'];
    const rows = [head];
    g.students.forEach((st, si) => {
      const row = [si + 1, st.fio];
      dates.forEach(d => row.push(Store.getMark(gid, disc, d, si)));
      const avg = Store.studentAvg(gid, disc, si);
      row.push(avg == null ? '' : avg.toFixed(2));
      rows.push(row);
    });
    // строка с темами уроков
    const topicRow = ['', 'Тема урока →'];
    dates.forEach(d => topicRow.push(Store.getTopic(gid, disc, d)));
    topicRow.push('');
    rows.push([]); rows.push(topicRow);
    return { rows, dates };
  }

  function prettyDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}`;
  }
  function isoFromPretty(s, year = 2025) {
    // принимает "01.09", "01.09.2025", "2025-09-01"
    s = String(s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
    if (m) {
      let yy = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : year;
      return `${yy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return null;
  }

  // ---------- ЭКСПОРТ ----------
  function exportXLSX(gid, disc) {
    if (!window.XLSX) { return exportCSV(gid, disc, true); }
    const g = Store.group(gid);
    const { rows } = buildMatrix(gid, disc);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // ширины колонок
    ws['!cols'] = [{ wch: 4 }, { wch: 34 }, ...rows[0].slice(2, -1).map(() => ({ wch: 6 })), { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Журнал');
    const fname = `Журнал_${g.name}_${cleanName(disc)}.xlsx`;
    XLSX.writeFile(wb, fname);
    return fname;
  }

  function exportCSV(gid, disc, asXls) {
    const g = Store.group(gid);
    const { rows } = buildMatrix(gid, disc);
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      return /[;\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const fname = `Журнал_${g.name}_${cleanName(disc)}.csv`;
    download(blob, fname);
    return fname;
  }

  // экспорт всего контингента
  function exportStudentsXLSX() {
    const rows = [['№', 'ФИО', 'ИИН', 'Дата рождения', 'Пол', 'Группа', 'Факультет', 'Специальность']];
    let i = 1;
    Store.groups().forEach(g => g.students.forEach(st => {
      rows.push([i++, st.fio, st.iin, st.birth, st.sex, g.name, g.faculty, g.dept]);
    }));
    if (window.XLSX) {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 4 }, { wch: 32 }, { wch: 16 }, { wch: 13 }, { wch: 9 }, { wch: 10 }, { wch: 28 }, { wch: 34 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Контингент');
      XLSX.writeFile(wb, 'Контингент_студентов.xlsx');
      return 'Контингент_студентов.xlsx';
    }
    const csv = rows.map(r => r.join(';')).join('\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv' }), 'Контингент_студентов.csv');
    return 'Контингент_студентов.csv';
  }

  // ---------- ИМПОРТ ----------
  // Принимает File, парсит как матрицу (xlsx/csv) и грузит оценки в текущую группу/дисциплину
  function importFile(file, gid, disc) {
    return new Promise((resolve, reject) => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const reader = new FileReader();
      reader.onload = e => {
        try {
          let aoa;
          if (ext === 'csv') {
            aoa = parseCSV(e.target.result);
          } else {
            if (!window.XLSX) return reject(new Error('Библиотека XLSX недоступна (нет интернета). Используйте CSV.'));
            const wb = XLSX.read(e.target.result, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
          }
          // 1) Это отчёт со структурой журнала (Группа/Дисциплина/Кол-во)?
          const det = detectStructure(aoa);
          if (det) {
            const groups = buildStructure(aoa, det);
            resolve({
              kind: 'structure', groups,
              count: groups.length,
              students: groups.reduce((a, g) => a + g.students.length, 0),
              disciplines: groups.reduce((a, g) => a + g.disciplines.length, 0)
            });
            return;
          }
          // 2) Иначе — таблица с оценками для текущей группы/дисциплины
          const res = applyMatrix(aoa, gid, disc);
          res.kind = 'marks';
          resolve(res);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
      if (ext === 'csv') reader.readAsText(file, 'utf-8');
      else reader.readAsArrayBuffer(file);
    });
  }

  // ---------- РАСПОЗНАВАНИЕ СТРУКТУРЫ ЖУРНАЛА (отчёт по группам/дисциплинам) ----------
  function detectStructure(aoa) {
    for (let r = 0; r < Math.min(aoa.length, 40); r++) {
      const row = (aoa[r] || []).map(c => String(c == null ? '' : c).trim().toLowerCase());
      const gi = row.findIndex(c => c === 'группа' || c === 'топ');
      const di = row.findIndex(c => c === 'дисциплина' || c === 'пән');
      if (gi >= 0 && di >= 0) {
        return {
          headerRow: r, gi, di,
          ci: row.findIndex(c => /колич|саны|обуч/.test(c)),
          fi: row.findIndex(c => /факультет/.test(c)),
          ki: row.findIndex(c => /кафедр/.test(c)),
        };
      }
    }
    return null;
  }

  // пул реальных студентов из исходного контингента (для заполнения списков групп)
  function studentPool() {
    const seen = new Set(), pool = [];
    ((window.SEED_DATA && window.SEED_DATA.groups) || []).forEach(g => (g.students || []).forEach(s => {
      const key = s.iin || s.fio;
      if (seen.has(key)) return;
      seen.add(key); pool.push(s);
    }));
    return pool.length ? pool : [{ fio: 'Студент', iin: '', birth: '', sex: '' }];
  }

  function cleanDisc(list) {
    const out = [], seen = new Set();
    list.forEach(d => {
      if (/^\d+\.\d/.test(d)) return;           // пропускаем длинные «задания» вида 12.3 ...
      let s = d.trim();
      if (s.length > 55) s = s.slice(0, 52) + '…';
      const k = s.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k); out.push(s);
    });
    return out.length ? out.slice(0, 16) : ['Профильная дисциплина'];
  }

  function buildStructure(aoa, det) {
    const groups = {}, order = [];
    for (let r = det.headerRow + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const g = String(row[det.gi] ?? '').trim();
      if (!g) continue;
      const d = String(row[det.di] ?? '').trim();
      const cnt = parseInt(String(det.ci >= 0 ? row[det.ci] ?? '' : '').replace(/[^\d]/g, '')) || 0;
      if (!groups[g]) {
        groups[g] = {
          fac: det.fi >= 0 ? String(row[det.fi] ?? '').trim() : '',
          dep: det.ki >= 0 ? String(row[det.ki] ?? '').trim().replace(/^"|"$/g, '') : '',
          cnt, disc: []
        };
        order.push(g);
      }
      if (cnt) groups[g].cnt = Math.max(groups[g].cnt, cnt);
      if (d && !groups[g].disc.includes(d)) groups[g].disc.push(d);
    }
    if (!order.length) throw new Error('В отчёте не найдено ни одной группы');
    const pool = studentPool(); let pi = 0;
    return order.map((name, i) => {
      const info = groups[name];
      const n = Math.max(info.cnt, 5);
      const students = [];
      for (let k = 0; k < n; k++) { students.push({ ...pool[pi % pool.length] }); pi++; }
      students.sort((a, b) => a.fio.localeCompare(b.fio, 'ru'));
      return { id: 'g' + i, name, faculty: info.fac, dept: info.dep, disciplines: cleanDisc(info.disc), students };
    });
  }

  function applyMatrix(aoa, gid, disc) {
    if (!aoa || !aoa.length) throw new Error('Пустой файл');
    const g = Store.group(gid);
    const head = aoa[0].map(x => String(x ?? '').trim());
    // определить колонки-даты (между ФИО и "Средний")
    const dateCols = [];
    head.forEach((h, idx) => {
      if (idx < 2) return;
      if (/средн/i.test(h)) return;
      const iso = isoFromPretty(h);
      if (iso) dateCols.push({ idx, iso });
    });
    // добавить новые даты в журнал
    dateCols.forEach(dc => Store.addDate(gid, disc, dc.iso));

    // сопоставление студентов по ФИО
    const byFio = {};
    g.students.forEach((st, si) => byFio[norm(st.fio)] = si);

    let imported = 0, matched = 0, topics = 0, newStudents = 0;
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r]; if (!row || !row.length) continue;
      const label = String(row[1] ?? '').trim();
      if (!label) continue;
      // строка тем урока
      if (/тема\s*урока/i.test(label)) {
        dateCols.forEach(dc => {
          const t = String(row[dc.idx] ?? '').trim();
          if (t) { Store.setTopic(gid, disc, dc.iso, t); topics++; }
        });
        continue;
      }
      const si = byFio[norm(label)];
      if (si == null) continue; // студента нет в группе — пропускаем
      matched++;
      dateCols.forEach(dc => {
        const v = String(row[dc.idx] ?? '').trim();
        if (v !== '') { Store.setMark(gid, disc, dc.iso, si, v); imported++; }
      });
    }
    return { imported, matched, topics, dates: dateCols.length, students: g.students.length };
  }

  // ---------- helpers ----------
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const delim = (text.split('\n')[0].split(';').length >= text.split('\n')[0].split(',').length) ? ';' : ',';
    const rows = []; let cur = [], val = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { val += '"'; i++; } else q = false; }
        else val += c;
      } else {
        if (c === '"') q = true;
        else if (c === delim) { cur.push(val); val = ''; }
        else if (c === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; }
        else if (c === '\r') {}
        else val += c;
      }
    }
    if (val !== '' || cur.length) { cur.push(val); rows.push(cur); }
    return rows;
  }
  const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  const cleanName = s => String(s).replace(/[^\wа-яА-Я ]/gi, '').replace(/\s+/g, '_').slice(0, 30);
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  return { exportXLSX, exportCSV, exportStudentsXLSX, importFile, prettyDate };
})();
