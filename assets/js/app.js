/* ===== app.js — SPA: роутинг и экраны журнала ===== */
(() => {
  const $ = s => document.querySelector(s);
  const view = $('#view');
  let charts = [];

  // текущий выбор журнала
  const sel = { gid: null, disc: null };

  // ---------- утилиты ----------
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const initials = fio => fio.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const I = (name, size) => (window.Icons ? Icons.svg(name, size) : ''); // SVG-иконка
  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = `<span class="ic">${I(type === 'ok' ? 'check' : type === 'err' ? 'alert' : 'info', 18)}</span>${esc(msg)}`;
    $('#toast').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; setTimeout(() => t.remove(), 300); }, 3200);
  }
  function destroyCharts() { charts.forEach(c => { try { c.destroy(); } catch (e) {} }); charts = []; }
  const grColor = v => v >= 4.5 ? 'm5' : v >= 3.5 ? 'm4' : v >= 2.5 ? 'm3' : 'm2';

  // модалка
  function modal(title, body, foot) {
    $('#modal').innerHTML = `
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" onclick="App.closeModal()">${I('x', 18)}</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
    $('#modalBg').classList.add('show');
  }
  const closeModal = () => $('#modalBg').classList.remove('show');
  $('#modalBg').addEventListener('click', e => { if (e.target.id === 'modalBg') closeModal(); });

  // выбор группы по умолчанию
  function ensureSel() {
    const gs = Store.groups();
    if (!sel.gid || !Store.group(sel.gid)) { sel.gid = gs[0]?.id; }
    const g = Store.group(sel.gid);
    if (!sel.disc || !g.disciplines.includes(sel.disc)) sel.disc = g.disciplines[0];
  }

  // ============ ROUTES ============
  const routes = {
    dashboard: { title: 'Главная', sub: 'Обзор успеваемости и активности', render: renderDashboard },
    journal: { title: 'Журнал оценок', sub: 'Выставление оценок по урокам', render: renderJournal },
    topics: { title: 'Темы уроков (КТП)', sub: 'Календарно-тематическое планирование', render: renderTopics },
    attendance: { title: 'Посещаемость', sub: 'Отметки присутствия студентов', render: renderAttendance },
    students: { title: 'Контингент', sub: 'Список студентов колледжа', render: renderStudents },
    groups: { title: 'Группы', sub: 'Учебные группы и дисциплины', render: renderGroups },
    analytics: { title: 'Аналитика', sub: 'Качество знаний и успеваемость', render: renderAnalytics },
    io: { title: 'Импорт / Экспорт', sub: 'Выгрузка и загрузка данных журнала', render: renderIO },
    settings: { title: 'Настройки', sub: 'Профиль и параметры системы', render: renderSettings },
  };

  function router() {
    destroyCharts();
    const hash = location.hash.replace('#/', '') || 'dashboard';
    const r = routes[hash] || routes.dashboard;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === hash));
    $('#pageTitle').textContent = r.title;
    $('#pageTitle').innerHTML = `${r.title}<small>${r.sub}</small>`;
    view.innerHTML = '';
    r.render();
    view.scrollTop = 0;
    $('#sidebar').classList.remove('open');
  }

  // ============ DASHBOARD ============
  function renderDashboard() {
    const s = Store.globalStats();
    view.innerHTML = `
      <div class="cards">
        ${stat('bg-blue', 'users', s.totalStudents, 'Студентов в контингенте', 'up', '+' + s.groups + ' групп')}
        ${stat('bg-teal', 'pencil', s.marks, 'Выставлено оценок', 'up', 'журнал')}
        ${stat('bg-green', 'star', s.avg ? s.avg.toFixed(2) : '—', 'Средний балл', s.avg >= 4 ? 'up' : 'down', s.avg ? s.avg.toFixed(1) : '0')}
        ${stat('bg-amber', 'target', (s.quality || 0).toFixed(0) + '%', 'Качество знаний', s.quality >= 50 ? 'up' : 'down', 'оценки 4–5')}
      </div>
      <div class="two-col">
        <div class="panel">
          <div class="panel-head"><h3>Динамика средних баллов по группам</h3><div class="spacer"></div><span class="badge blue">ТОП-8</span></div>
          <div class="panel-body"><canvas id="chDash" height="120"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Распределение оценок</h3></div>
          <div class="panel-body"><canvas id="chPie" height="120"></canvas></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Быстрый доступ к группам</h3><div class="spacer"></div>
          <a href="#/journal" class="btn ghost sm">Открыть журнал →</a></div>
        <div class="panel-body"><div class="gcards" id="quickGroups"></div></div>
      </div>`;

    // быстрые группы
    const qg = $('#quickGroups');
    Store.groups().slice(0, 6).forEach(g => {
      const st = Store.groupStats(g.id, g.disciplines[0]) || {};
      const el = document.createElement('div');
      el.className = 'gcard';
      el.innerHTML = `
        <div class="gtop"><div class="gbadge">${esc(g.name.split(' ')[0])}</div>
          <div><h4>${esc(g.name)}</h4><div class="meta">${esc(g.faculty || '—')}</div></div></div>
        <div class="gstats">
          <div><b>${g.students.length}</b><span>студентов</span></div>
          <div><b>${g.disciplines.length}</b><span>дисциплин</span></div>
          <div><b>${(st.avg || 0).toFixed(1)}</b><span>ср. балл</span></div>
        </div>`;
      el.onclick = () => { sel.gid = g.id; sel.disc = g.disciplines[0]; location.hash = '#/journal'; };
      qg.appendChild(el);
    });

    drawDashCharts();
  }

  function stat(bg, ic, big, lbl, trend, tval) {
    return `<div class="stat">
      <div class="trend ${trend}">${trend === 'up' ? '▲' : '▼'} ${esc(tval)}</div>
      <div class="ic ${bg}">${I(ic, 22)}</div>
      <div class="big">${esc(big)}</div><div class="lbl">${esc(lbl)}</div></div>`;
  }

  function drawDashCharts() {
    if (!window.Chart) return;
    const gs = Store.groups().slice(0, 8);
    const labels = gs.map(g => g.name);
    const data = gs.map(g => { const s = Store.groupStats(g.id, g.disciplines[0]); return s ? +s.avg.toFixed(2) : 0; });
    charts.push(new Chart($('#chDash'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Средний балл', data, backgroundColor: '#10b981', borderRadius: 6, maxBarThickness: 34 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5 } }, responsive: true }
    }));
    // распределение оценок
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0 };
    Store.groups().forEach(g => g.disciplines.forEach(d => g.students.forEach((_, si) =>
      Store.datesFor(g.id, d).forEach(dt => { const v = Store.getMark(g.id, d, dt, si); if (dist[v] != null) dist[v]++; }))));
    charts.push(new Chart($('#chPie'), {
      type: 'doughnut',
      data: { labels: ['Отлично (5)', 'Хорошо (4)', 'Удовл. (3)', 'Неуд. (2)'],
        datasets: [{ data: [dist[5], dist[4], dist[3], dist[2]], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '62%' }
    }));
  }

  // ============ JOURNAL ============
  function selectorBar(onChange) {
    ensureSel();
    const gs = Store.groups();
    const g = Store.group(sel.gid);
    return `
      <div class="toolbar">
        <div class="ctl"><label>Группа</label>
          <select id="selGroup">${gs.map(x => `<option value="${x.id}" ${x.id === sel.gid ? 'selected' : ''}>${esc(x.name)} · ${esc(x.faculty || '')}</option>`).join('')}</select></div>
        <div class="ctl"><label>Дисциплина</label>
          <select id="selDisc">${g.disciplines.map(d => `<option value="${esc(d)}" ${d === sel.disc ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
        <div class="spacer"></div>
        ${onChange ? '' : ''}
      </div>`;
  }
  function wireSelector(cb) {
    $('#selGroup').onchange = e => { sel.gid = e.target.value; const g = Store.group(sel.gid); sel.disc = g.disciplines[0]; cb(); };
    $('#selDisc').onchange = e => { sel.disc = e.target.value; cb(); };
  }

  function renderJournal() {
    ensureSel();
    view.innerHTML = `
      ${selectorBar()}
      <div class="panel">
        <div class="panel-head">
          <h3 id="jTitle"></h3><div class="spacer"></div>
          <div class="legend" style="margin-right:8px">
            <span><b class="chip-grade m5">5</b></span><span><b class="chip-grade m4">4</b></span>
            <span><b class="chip-grade m3">3</b></span><span><b class="chip-grade m2">2</b></span>
            <span><b class="att">Н</b> — отсутствовал</span>
          </div>
          <button class="btn ghost sm" id="addDateBtn">${I('plus', 16)} Урок</button>
          <button class="btn green sm" id="expXlsx">${I('sheet', 16)} Excel</button>
          <button class="btn soft sm" id="expCsv">${I('fileText', 16)} CSV</button>
        </div>
        <div class="panel-body" style="padding:0">
          <div id="journalGrid"></div>
        </div>
      </div>
      <p class="muted center" style="margin-top:6px">Введите оценку (2–5) или «Н» (отсутствие). Данные сохраняются автоматически. Клик по дате — удалить урок.</p>`;
    wireSelector(renderJournal);
    drawGrid();
    $('#addDateBtn').onclick = addLessonPrompt;
    $('#expXlsx').onclick = () => { const f = IO.exportXLSX(sel.gid, sel.disc); toast('Выгружено: ' + f, 'ok'); };
    $('#expCsv').onclick = () => { const f = IO.exportCSV(sel.gid, sel.disc); toast('Выгружено: ' + f, 'ok'); };
  }

  function drawGrid() {
    const g = Store.group(sel.gid);
    const dates = Store.datesFor(sel.gid, sel.disc);
    $('#jTitle').textContent = `${g.name} — ${sel.disc}`;
    const dayName = iso => ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][new Date(iso).getDay()];
    let html = `<div class="jwrap"><table class="journal"><thead><tr>
      <th class="col-num">№</th><th class="col-name">Студент</th>
      ${dates.map(d => `<th class="date-col" data-d="${d}" title="Удалить урок ${IO.prettyDate(d)}">${IO.prettyDate(d)}<small>${dayName(d)}</small></th>`).join('')}
      <th class="avg-col">Ср.</th></tr></thead><tbody>`;
    g.students.forEach((st, si) => {
      const avg = Store.studentAvg(sel.gid, sel.disc, si);
      html += `<tr><td class="col-num">${si + 1}</td>
        <td class="col-name"><span class="avatar-sm">${esc(initials(st.fio))}</span>${esc(st.fio)}</td>`;
      dates.forEach(d => {
        const v = Store.getMark(sel.gid, sel.disc, d, si);
        const cls = v === 'Н' || v === 'н' ? 'att' : (v ? 'm' + v : '');
        html += `<td class="cell"><input data-si="${si}" data-d="${d}" maxlength="2" value="${esc(v)}" class="${cls}"></td>`;
      });
      html += `<td class="avg-col"><span class="avgval ${avg ? grColor(avg) : ''}">${avg == null ? '—' : avg.toFixed(2)}</span></td></tr>`;
    });
    html += `</tbody></table></div>`;
    $('#journalGrid').innerHTML = html;

    // ввод оценок
    $('#journalGrid').querySelectorAll('.cell input').forEach(inp => {
      inp.addEventListener('input', e => {
        let v = e.target.value.trim();
        if (v && !/^([2-5]|[нНnNбБ+\-])$/.test(v)) { v = v.slice(0, 1); }
        if (v === 'n' || v === 'N' || v === 'б' || v === 'Б') v = 'Н';
        e.target.value = v;
        Store.setMark(sel.gid, sel.disc, e.target.dataset.d, +e.target.dataset.si, v);
        e.target.className = v === 'Н' ? 'att' : (v ? 'm' + v : '');
        updateRowAvg(e.target.closest('tr'), +e.target.dataset.si);
      });
      inp.addEventListener('keydown', e => {
        const td = e.target.closest('td');
        const move = (sib) => { const c = sib && sib.querySelector('input'); if (c) { c.focus(); c.select(); e.preventDefault(); } };
        if (e.key === 'ArrowRight') move(td.nextElementSibling);
        if (e.key === 'ArrowLeft') move(td.previousElementSibling);
        if (e.key === 'Enter' || e.key === 'ArrowDown') { const r = td.closest('tr').nextElementSibling; if (r) move([...r.children][td.cellIndex]); }
        if (e.key === 'ArrowUp') { const r = td.closest('tr').previousElementSibling; if (r) move([...r.children][td.cellIndex]); }
      });
    });
    // удаление урока
    $('#journalGrid').querySelectorAll('.date-col').forEach(th => th.onclick = () => {
      if (confirm('Удалить урок ' + IO.prettyDate(th.dataset.d) + '? Оценки за этот день будут скрыты.')) {
        Store.removeDate(sel.gid, sel.disc, th.dataset.d); drawGrid();
      }
    });
  }
  function updateRowAvg(tr, si) {
    const avg = Store.studentAvg(sel.gid, sel.disc, si);
    const cell = tr.querySelector('.avgval');
    cell.textContent = avg == null ? '—' : avg.toFixed(2);
    cell.className = 'avgval ' + (avg ? grColor(avg) : '');
  }
  function addLessonPrompt() {
    modal('Добавить урок', `
      <div class="field"><label>Дата урока</label><input type="date" id="newDate" value="${Store.fmt(new Date())}"></div>
      <div class="field"><label>Тема урока (необязательно)</label><input type="text" id="newTopic" placeholder="Например: Контрольная работа №1"></div>`,
      `<button class="btn soft" onclick="App.closeModal()">Отмена</button>
       <button class="btn" id="saveLesson">Добавить</button>`);
    $('#saveLesson').onclick = () => {
      const d = $('#newDate').value; if (!d) return;
      Store.addDate(sel.gid, sel.disc, d);
      const t = $('#newTopic').value.trim(); if (t) Store.setTopic(sel.gid, sel.disc, d, t);
      closeModal(); drawGrid(); toast('Урок добавлен', 'ok');
    };
  }

  // ============ TOPICS (КТП) ============
  function renderTopics() {
    ensureSel();
    view.innerHTML = `${selectorBar()}
      <div class="panel"><div class="panel-head"><h3 id="tpTitle"></h3><div class="spacer"></div>
        <button class="btn ghost sm" id="addT">${I('plus', 16)} Урок</button></div>
        <div class="panel-body" id="topicList"></div></div>`;
    wireSelector(renderTopics);
    drawTopics();
    $('#addT').onclick = addLessonPrompt;
  }
  function drawTopics() {
    const g = Store.group(sel.gid);
    $('#tpTitle').textContent = `${g.name} — ${sel.disc}`;
    const dates = Store.datesFor(sel.gid, sel.disc);
    const monthName = m => ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'][m];
    $('#topicList').innerHTML = dates.map((d, i) => {
      const dt = new Date(d);
      return `<div class="lesson">
        <div class="ldate"><b>${dt.getDate()}</b><span>${monthName(dt.getMonth())}</span></div>
        <div class="lbody"><input data-d="${d}" placeholder="Урок ${i + 1}: введите тему урока..." value="${esc(Store.getTopic(sel.gid, sel.disc, d))}"></div>
      </div>`;
    }).join('') || `<div class="empty-state"><div class="big">${I('book', 50)}</div>Уроки ещё не запланированы</div>`;
    $('#topicList').querySelectorAll('input').forEach(inp => inp.onchange = e =>
      { Store.setTopic(sel.gid, sel.disc, e.target.dataset.d, e.target.value.trim()); toast('Тема сохранена', 'ok'); });
  }

  // ============ ATTENDANCE ============
  function renderAttendance() {
    ensureSel();
    view.innerHTML = `${selectorBar()}
      <div class="toolbar"><div class="ctl"><label>Дата урока</label><input type="date" id="attDate" value="${Store.fmt(new Date())}"></div></div>
      <div class="panel"><div class="panel-head"><h3>Отметка посещаемости</h3><div class="spacer"></div>
        <button class="btn green sm" id="allPresent">Все присутствуют</button></div>
        <div class="panel-body"><table class="dtable" id="attTable"></table></div></div>`;
    wireSelector(renderAttendance);
    const draw = () => {
      const g = Store.group(sel.gid); const d = $('#attDate').value;
      Store.addDate(sel.gid, sel.disc, d);
      $('#attTable').innerHTML = `<thead><tr><th>№</th><th>Студент</th><th>Статус</th></tr></thead><tbody>${
        g.students.map((st, si) => {
          const v = Store.getMark(sel.gid, sel.disc, d, si);
          const absent = v === 'Н';
          return `<tr><td>${si + 1}</td><td><span class="avatar-sm">${esc(initials(st.fio))}</span>${esc(st.fio)}</td>
            <td><button class="btn sm ${absent ? 'soft' : 'green'}" data-si="${si}">${absent ? 'Отсутствует' : 'Присутствует'}</button></td></tr>`;
        }).join('')}</tbody>`;
      $('#attTable').querySelectorAll('button[data-si]').forEach(b => b.onclick = () => {
        const si = +b.dataset.si; const cur = Store.getMark(sel.gid, sel.disc, d, si);
        Store.setMark(sel.gid, sel.disc, d, si, cur === 'Н' ? '' : 'Н'); draw();
      });
    };
    $('#attDate').onchange = draw;
    $('#allPresent').onclick = () => { const g = Store.group(sel.gid), d = $('#attDate').value;
      g.students.forEach((_, si) => { if (Store.getMark(sel.gid, sel.disc, d, si) === 'Н') Store.setMark(sel.gid, sel.disc, d, si, ''); }); draw(); toast('Отмечены все присутствующие', 'ok'); };
    draw();
  }

  // ============ STUDENTS ============
  let stPage = 0; const PAGE = 40; let stFilter = '';
  function renderStudents() {
    const all = [];
    Store.groups().forEach(g => g.students.forEach(st => all.push({ ...st, grp: g.name, fac: g.faculty, dept: g.dept })));
    view.innerHTML = `
      <div class="toolbar">
        <div class="ctl"><label>Поиск</label><input id="stSearch" placeholder="ФИО или ИИН..." value="${esc(stFilter)}" style="min-width:260px"></div>
        <div class="spacer"></div>
        <button class="btn green sm" id="expStud">${I('download', 16)} Экспорт контингента (Excel)</button>
      </div>
      <div class="panel"><div class="panel-body" style="padding:0">
        <table class="dtable"><thead><tr><th>№</th><th>ФИО</th><th>ИИН</th><th>Дата рожд.</th><th>Пол</th><th>Группа</th><th>Специальность</th></tr></thead>
        <tbody id="stBody"></tbody></table>
        <div class="flex" style="justify-content:center;padding:16px;gap:14px">
          <button class="btn soft sm" id="stPrev">← Назад</button>
          <span class="muted" id="stInfo"></span>
          <button class="btn soft sm" id="stNext">Вперёд →</button></div>
      </div></div>`;
    const draw = () => {
      const f = stFilter.toLowerCase();
      const filtered = f ? all.filter(s => (s.fio + ' ' + s.iin).toLowerCase().includes(f)) : all;
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
      stPage = Math.min(stPage, pages - 1);
      const slice = filtered.slice(stPage * PAGE, stPage * PAGE + PAGE);
      $('#stBody').innerHTML = slice.map((s, i) => `<tr>
        <td>${stPage * PAGE + i + 1}</td>
        <td><span class="avatar-sm">${esc(initials(s.fio))}</span>${esc(s.fio)}</td>
        <td class="muted">${esc(s.iin)}</td><td>${esc(s.birth)}</td>
        <td><span class="badge ${s.sex === 'мужской' ? 'blue' : 'teal'}">${esc(s.sex || '—')}</span></td>
        <td><span class="badge gray">${esc(s.grp)}</span></td>
        <td class="muted">${esc(s.dept || s.fac || '—')}</td></tr>`).join('')
        || `<tr><td colspan="7"><div class="empty-state"><div class="big">${I('search', 50)}</div>Ничего не найдено</div></td></tr>`;
      $('#stInfo').textContent = `${filtered.length} студентов · стр. ${stPage + 1}/${pages}`;
    };
    $('#stSearch').oninput = e => { stFilter = e.target.value; stPage = 0; draw(); };
    $('#stPrev').onclick = () => { if (stPage > 0) { stPage--; draw(); } };
    $('#stNext').onclick = () => { stPage++; draw(); };
    $('#expStud').onclick = () => { const f = IO.exportStudentsXLSX(); toast('Выгружено: ' + f, 'ok'); };
    draw();
  }

  // ============ GROUPS ============
  function renderGroups() {
    view.innerHTML = `<div class="gcards" id="gc"></div>`;
    const gc = $('#gc');
    Store.groups().forEach(g => {
      const st = Store.groupStats(g.id, g.disciplines[0]) || {};
      const el = document.createElement('div');
      el.className = 'gcard';
      el.innerHTML = `
        <div class="gtop"><div class="gbadge">${esc(g.name.split(' ')[0])}</div>
          <div><h4>${esc(g.name)}</h4><div class="meta">${esc(g.faculty || '—')}</div></div></div>
        <div class="meta" style="min-height:32px">${esc((g.dept || '').slice(0, 70))}</div>
        <div class="gstats">
          <div><b>${g.students.length}</b><span>студентов</span></div>
          <div><b>${g.disciplines.length}</b><span>дисциплин</span></div>
          <div><b>${(st.avg || 0).toFixed(1)}</b><span>ср. балл</span></div>
        </div>`;
      el.onclick = () => { sel.gid = g.id; sel.disc = g.disciplines[0]; location.hash = '#/journal'; };
      gc.appendChild(el);
    });
  }

  // ============ ANALYTICS ============
  function renderAnalytics() {
    ensureSel();
    const g = Store.group(sel.gid);
    view.innerHTML = `${selectorBar()}
      <div class="cards" id="anCards"></div>
      <div class="two-col">
        <div class="panel"><div class="panel-head"><h3>Качество знаний по дисциплинам</h3></div>
          <div class="panel-body"><canvas id="chQ" height="150"></canvas></div></div>
        <div class="panel"><div class="panel-head"><h3>Показатели группы</h3></div>
          <div class="panel-body" id="bars"></div></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>Рейтинг студентов · ${esc(g.name)} — ${esc(sel.disc)}</h3></div>
        <div class="panel-body" style="padding:0"><table class="dtable" id="ratingTable"></table></div></div>`;
    wireSelector(renderAnalytics);
    drawAnalytics();
  }
  function drawAnalytics() {
    const g = Store.group(sel.gid);
    const s = Store.groupStats(sel.gid, sel.disc) || { avg: 0, success: 0, quality: 0, attendance: 100, count: 0 };
    $('#anCards').innerHTML = `
      ${stat('bg-blue', 'star', s.avg.toFixed(2), 'Средний балл', s.avg >= 4 ? 'up' : 'down', 'группа')}
      ${stat('bg-green', 'trendUp', s.success.toFixed(0) + '%', 'Успеваемость', 'up', '≥3')}
      ${stat('bg-amber', 'target', s.quality.toFixed(0) + '%', 'Качество знаний', s.quality >= 50 ? 'up' : 'down', '≥4')}
      ${stat('bg-teal', 'check', s.attendance.toFixed(0) + '%', 'Посещаемость', s.attendance >= 90 ? 'up' : 'down', 'присут.')}`;

    // показатели — прогресс-бары
    const bar = (lbl, val, color) => `<div class="kv"><span>${lbl}</span><b>${val.toFixed(0)}%</b></div>
      <div class="progress" style="margin-bottom:16px"><i style="width:${Math.min(val,100)}%;background:${color}"></i></div>`;
    $('#bars').innerHTML = bar('Успеваемость', s.success, '#10b981') + bar('Качество знаний', s.quality, '#f59e0b')
      + bar('Посещаемость', s.attendance, '#14b8a6') + bar('Заполнение журнала', Math.min(s.count / (g.students.length * Store.datesFor(sel.gid, sel.disc).length || 1) * 100, 100), '#3b82f6');

    // рейтинг студентов
    const ranked = g.students.map((st, si) => ({ fio: st.fio, avg: Store.studentAvg(sel.gid, sel.disc, si) }))
      .filter(x => x.avg != null).sort((a, b) => b.avg - a.avg);
    $('#ratingTable').innerHTML = `<thead><tr><th>Место</th><th>Студент</th><th>Средний балл</th><th>Уровень</th></tr></thead><tbody>${
      ranked.map((r, i) => `<tr><td><b>${i + 1}</b></td>
        <td><span class="avatar-sm">${esc(initials(r.fio))}</span>${esc(r.fio)}</td>
        <td><b class="${grColor(r.avg)}">${r.avg.toFixed(2)}</b></td>
        <td><span class="badge ${r.avg >= 4.5 ? 'green' : r.avg >= 3.5 ? 'blue' : r.avg >= 2.5 ? 'amber' : 'gray'}">${
          r.avg >= 4.5 ? 'Отличник' : r.avg >= 3.5 ? 'Хорошист' : r.avg >= 2.5 ? 'Удовл.' : 'Слабо'}</span></td></tr>`).join('')
      || `<tr><td colspan="4"><div class="empty-state">Нет оценок для рейтинга</div></td></tr>`}</tbody>`;

    if (window.Chart) {
      const labels = g.disciplines, data = labels.map(d => +(Store.groupStats(sel.gid, d)?.quality || 0).toFixed(1));
      charts.push(new Chart($('#chQ'), {
        type: 'bar',
        data: { labels: labels.map(l => l.length > 18 ? l.slice(0, 16) + '…' : l), datasets: [{ data, backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100 } } }
      }));
    }
  }

  // ============ IMPORT / EXPORT ============
  function renderIO() {
    ensureSel();
    const g = Store.group(sel.gid);
    view.innerHTML = `
      <div class="two-col">
        <div class="panel"><div class="panel-head"><h3><span class="ic" style="color:var(--brand);vertical-align:-3px">${I('download', 18)}</span> Выгрузка журнала</h3></div>
          <div class="panel-body">
            <p class="muted" style="margin-bottom:16px">Текущий журнал будет выгружен в таблицу со студентами, оценками по датам, средним баллом и темами уроков.</p>
            ${selectorBar()}
            <div class="flex wrap">
              <button class="btn green" id="dlXlsx">${I('sheet', 16)} Скачать Excel (.xlsx)</button>
              <button class="btn soft" id="dlCsv">${I('fileText', 16)} Скачать CSV</button>
            </div>
            <hr style="border:none;border-top:1px solid var(--line);margin:20px 0">
            <p class="muted" style="margin-bottom:12px">Прочие выгрузки:</p>
            <div class="flex wrap">
              <button class="btn teal" id="dlStud">${I('users', 16)} Контингент студентов (Excel)</button>
              <button class="btn soft" id="dlBackup">${I('save', 16)} Резервная копия (JSON)</button>
            </div>
          </div></div>

        <div class="panel"><div class="panel-head"><h3><span class="ic" style="color:var(--brand);vertical-align:-3px">${I('upload', 18)}</span> Загрузка журнала</h3></div>
          <div class="panel-body">
            <p class="muted" style="margin-bottom:14px">Загрузите ранее выгруженный файл (.xlsx или .csv). Оценки сопоставляются со студентами по ФИО и добавляются в выбранную группу/дисциплину.</p>
            <div class="dropzone" id="dz">
              <div class="big">${I('folder', 40)}</div>
              <b>Перетащите файл сюда</b><br><span>или нажмите, чтобы выбрать (.xlsx, .csv)</span>
            </div>
            <input type="file" id="fileInp" accept=".xlsx,.xls,.csv" style="display:none">
            <div class="mt"><span class="badge gray">Цель загрузки:</span> <b id="impTarget">${esc(g.name)} — ${esc(sel.disc)}</b></div>
            <hr style="border:none;border-top:1px solid var(--line);margin:18px 0">
            <p class="muted" style="margin-bottom:10px">Восстановление из резервной копии:</p>
            <button class="btn soft sm" id="restoreBtn">${I('rotate', 16)} Загрузить JSON-копию</button>
            <input type="file" id="jsonInp" accept=".json" style="display:none">
          </div></div>
      </div>
      <div class="panel"><div class="panel-head"><h3>Формат таблицы журнала</h3></div>
        <div class="panel-body">
          <p class="muted">Файл должен содержать строку заголовка: <code>№ | ФИО студента | даты (01.09, 02.09, …) | Средний балл</code>.
          Дополнительная строка <b>«Тема урока →»</b> импортирует темы. Оценки: 2–5, отсутствие — «Н».</p>
        </div></div>`;
    wireSelector(() => { const g2 = Store.group(sel.gid); $('#impTarget').textContent = `${g2.name} — ${sel.disc}`; });

    $('#dlXlsx').onclick = () => toast('Выгружено: ' + IO.exportXLSX(sel.gid, sel.disc), 'ok');
    $('#dlCsv').onclick = () => toast('Выгружено: ' + IO.exportCSV(sel.gid, sel.disc), 'ok');
    $('#dlStud').onclick = () => toast('Выгружено: ' + IO.exportStudentsXLSX(), 'ok');
    $('#dlBackup').onclick = () => {
      const blob = new Blob([Store.exportState()], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'backup_journal_' + Store.fmt(new Date()) + '.json'; a.click();
      toast('Резервная копия сохранена', 'ok');
    };

    const dz = $('#dz'), fi = $('#fileInp');
    dz.onclick = () => fi.click();
    ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) handleImport(e.dataTransfer.files[0]); });
    fi.onchange = e => { if (e.target.files[0]) handleImport(e.target.files[0]); };

    $('#restoreBtn').onclick = () => $('#jsonInp').click();
    $('#jsonInp').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = ev => { try { Store.importState(ev.target.result); toast('Данные восстановлены', 'ok'); router(); } catch (er) { toast('Ошибка JSON', 'err'); } };
      rd.readAsText(f);
    };
  }

  function handleImport(file) {
    IO.importFile(file, sel.gid, sel.disc).then(r => {
      modal('Импорт завершён', `
        <div class="cards" style="margin:0">
          ${stat('bg-green', 'check', r.imported, 'Оценок загружено', 'up', 'ok')}
          ${stat('bg-blue', 'users', r.matched, 'Студентов сопоставлено', 'up', 'из ' + r.students)}
          ${stat('bg-amber', 'book', r.topics, 'Тем уроков', 'up', 'тем')}
        </div>
        <p class="muted mt">Загружено в: <b>${esc(Store.group(sel.gid).name)} — ${esc(sel.disc)}</b>. Распознано дат: ${r.dates}.</p>`,
        `<button class="btn" onclick="App.closeModal();location.hash='#/journal'">Открыть журнал →</button>`);
      toast('Импорт: ' + r.imported + ' оценок', 'ok');
    }).catch(err => { modal('Ошибка импорта', `<p>${esc(err.message)}</p>`, `<button class="btn soft" onclick="App.closeModal()">Закрыть</button>`); });
  }

  // ============ SETTINGS ============
  function renderSettings() {
    const u = Store.user() || {};
    view.innerHTML = `
      <div class="two-col">
        <div class="panel"><div class="panel-head"><h3>Профиль преподавателя</h3></div>
          <div class="panel-body">
            <div class="flex" style="margin-bottom:20px"><div class="user-chip" style="background:var(--bg)">
              <div class="av" style="width:54px;height:54px;font-size:22px">${esc(initials(u.name || 'П'))}</div>
              <div><b style="color:var(--ink);font-size:16px">${esc(u.name || 'Преподаватель')}</b><span>Преподаватель колледжа</span></div></div></div>
            <div class="field"><label>ФИО</label><input id="setName" value="${esc(u.name || '')}"></div>
            <div class="field"><label>Предмет / кафедра</label><input id="setSubj" value="${esc(u.subject || '')}" placeholder="например: Информатика"></div>
            <button class="btn" id="saveProfile">Сохранить профиль</button>
          </div></div>
        <div class="panel"><div class="panel-head"><h3>Система</h3></div>
          <div class="panel-body">
            <div class="field"><label>Система оценивания</label>
              <select id="setScale"><option value="5">5-балльная (2–5)</option><option value="100">100-балльная</option></select></div>
            <div class="kv"><span>Групп в системе</span><b>${Store.groups().length}</b></div>
            <div class="kv"><span>Студентов всего</span><b>${Store.globalStats().totalStudents}</b></div>
            <div class="kv"><span>Оценок выставлено</span><b>${Store.globalStats().marks}</b></div>
            <hr style="border:none;border-top:1px solid var(--line);margin:16px 0">
            <p class="muted" style="margin-bottom:10px">Опасная зона:</p>
            <button class="btn soft sm" id="resetBtn" style="color:var(--c-red)">${I('trash', 16)} Очистить все оценки и темы</button>
          </div></div>
      </div>`;
    $('#saveProfile').onclick = () => {
      Store.setUser({ ...u, name: $('#setName').value, subject: $('#setSubj').value });
      paintUser(); toast('Профиль сохранён', 'ok');
    };
    $('#resetBtn').onclick = () => { if (confirm('Удалить ВСЕ оценки, темы и настройки? Действие необратимо.')) { Store.resetAll(); toast('Данные очищены', 'ok'); setTimeout(() => location.reload(), 600); } };
  }

  // ============ AUTH ============
  function paintUser() {
    const u = Store.user();
    if (u) { $('#userName').textContent = u.name || 'Преподаватель'; $('#userAv').textContent = initials(u.name || 'П'); }
  }
  function showApp() {
    $('#login').style.display = 'none';
    $('#app').style.display = 'block';
    paintUser();
    if (!location.hash) location.hash = '#/dashboard';
    router();
  }

  function bootstrap() {
    Store.init();
    // авто-вход, если уже логинились
    if (Store.user()) showApp();

    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const login = $('#liLogin').value.trim(), pass = $('#liPass').value;
      if (login === 'teacher' && pass === '1234') {
        Store.setUser({ name: $('#liName').value.trim() || 'Преподаватель', login });
        showApp(); toast('Добро пожаловать!', 'ok');
      } else { toast('Неверный логин или пароль', 'err'); }
    });
    $('#logoutBtn').addEventListener('click', () => { Store.setUser(null); location.reload(); });
    $('#hamb').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#quickExport').addEventListener('click', () => { ensureSel(); toast('Выгружено: ' + IO.exportXLSX(sel.gid, sel.disc), 'ok'); });

    // глобальный поиск -> студенты
    $('#globalSearch').addEventListener('keydown', e => {
      if (e.key === 'Enter') { stFilter = e.target.value; location.hash = '#/students'; }
    });

    window.addEventListener('hashchange', router);
  }

  // публичный API для inline-обработчиков
  window.App = { closeModal };

  bootstrap();
})();
