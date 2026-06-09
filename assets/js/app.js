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
    if (window.I18n) I18n.apply(t);
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
    if (window.I18n) I18n.apply($('#modal'));
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
    schedule: { title: 'Расписание', sub: 'Сабақ кестесі — недельное расписание занятий', render: renderSchedule },
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
    const hash = location.hash.replace('#/', '') || 'schedule';
    const r = routes[hash] || routes.dashboard;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === hash));
    $('#pageTitle').textContent = r.title;
    $('#pageTitle').innerHTML = `${r.title}<small>${r.sub}</small>`;
    view.innerHTML = '';
    r.render();
    view.scrollTop = 0;
    closeSidebar();
    if (window.I18n) I18n.apply(document.body);
  }
  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#sbBackdrop') && $('#sbBackdrop').classList.remove('show');
  }

  // плоская KPI-карточка с боковым акцентом и мини-прогрессом
  function kpi(accent, icon, num, lbl, cap, prog) {
    return `<div class="kpi" style="--accent:${accent}">
      <div class="kpi-top"><div class="kpi-ic">${I(icon, 20)}</div><span class="kpi-cap">${esc(cap)}</span></div>
      <div class="kpi-num">${esc(num)}</div><div class="kpi-lbl">${esc(lbl)}</div>
      ${prog != null ? `<div class="kpi-prog"><i style="width:${Math.min(prog, 100)}%"></i></div>` : ''}
    </div>`;
  }

  const ANNOUNCEMENTS = [
    ['08.09.2025 09:12', 'График проведения предметных кружков на 2025–2026 учебный год'],
    ['05.09.2025 14:30', 'Расписание спортивных секций АВПК на 2025–2026 учебный год'],
    ['03.09.2025 11:05', 'График кураторских часов отделения «Общеобразовательные дисциплины»'],
    ['02.09.2025 16:40', 'График кураторских часов отделения «Автоматизация и управление»'],
    ['01.09.2025 10:00', 'График кураторских часов отделения «Технические специальности»'],
  ];

  // ============ DASHBOARD (приветствие + объявления, стиль Platonus) ============
  function renderDashboard() {
    ensureAllGrades();
    const s = Store.globalStats();
    const name = (Store.user() && Store.user().name) || 'Преподаватель';
    view.innerHTML = `
      <div class="welcome">Добро пожаловать,<b>${esc(name)}!</b></div>
      <div class="ann-tabs">
        <button class="ann-tab active" data-tab="ann">Объявления</button>
        <button class="ann-tab" data-tab="letters">Письма</button>
      </div>
      <div class="ann" id="annBox"></div>
      <button class="btn ann-more" id="annMore">Подробнее…</button>

      <div class="kpis" style="margin-top:26px">
        ${kpi('var(--c-blue)', 'school', s.groups, 'Учебных групп', 'Группы')}
        ${kpi('var(--c-teal)', 'users', s.totalStudents, 'Студентов в контингенте', 'Контингент')}
        ${kpi('var(--g5)', 'star', s.avg ? s.avg.toFixed(2) : '—', 'Средний балл', 'Успеваемость', (s.avg || 0) / 5 * 100)}
        ${kpi('var(--c-amber)', 'target', (s.quality || 0).toFixed(0) + '%', 'Качество знаний', 'Качество знаний', s.quality || 0)}
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

    // объявления / письма
    const drawAnn = (tab) => {
      if (tab === 'letters') {
        $('#annBox').innerHTML = `<div class="empty-state"><div class="big">${I('mail', 50)}</div>Новых писем нет</div>`;
        return;
      }
      $('#annBox').innerHTML = `<table class="ann-table"><thead><tr><th>Дата</th><th>Тема</th></tr></thead><tbody>${
        ANNOUNCEMENTS.map(a => `<tr><td class="ann-date">${esc(a[0])}</td><td class="ann-theme"><a href="#/schedule">${esc(a[1])}.</a></td></tr>`).join('')
        }</tbody></table>`;
      if (window.I18n) I18n.apply($('#annBox'));
    };
    drawAnn('ann');
    view.querySelectorAll('.ann-tab').forEach(t => t.onclick = () => {
      view.querySelectorAll('.ann-tab').forEach(x => x.classList.toggle('active', x === t));
      drawAnn(t.dataset.tab);
    });
    $('#annMore').onclick = () => toast('Все объявления доступны на портале колледжа', 'info');

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
      data: { labels, datasets: [{ label: 'Средний балл', data, backgroundColor: '#1f4fd0', borderRadius: 5, maxBarThickness: 34 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5 } }, responsive: true }
    }));
    // распределение оценок (быстрый подсчёт по сохранённым оценкам)
    const dist = Store.markDistribution();
    charts.push(new Chart($('#chPie'), {
      type: 'doughnut',
      data: { labels: ['Отлично (5)', 'Хорошо (4)', 'Удовл. (3)', 'Неуд. (2)'],
        datasets: [{ data: [dist[5], dist[4], dist[3], dist[2]], backgroundColor: ['#138a5b', '#1f4fd0', '#bd7a14', '#cf3b36'], borderWidth: 0 }] },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '62%' }
    }));
  }

  // ============ РАСПИСАНИЕ (Сабақ кестесі) ============
  const SCH_DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
  const SCH_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const SCH_SLOTS = [['08:00', '08:45'], ['08:50', '09:35'], ['09:45', '10:30'], ['10:40', '11:20'], ['11:25', '12:05'], ['12:10', '12:50'], ['13:30', '14:15'], ['14:20', '15:05']];
  const TEACHERS = ['Асель Нагашибаева', 'Юлия Сергеевна П.', 'Багдагүл Бескереева', 'Лариса Георгиевна Щ.', 'Гүлфарам Төлепкерей', 'Диля Лутфурахманова', 'Марат Сейтжанов', 'Айгүл Қасымова', 'Елена Викторовна Р.', 'Нұрлан Әбенов', 'Светлана Ивановна К.', 'Жанар Оспанова'];
  const TOPIC_POOL = ['Новая тема', 'Повторение', 'Решение задач', 'Закрепление материала', 'Контрольная работа', 'Обобщение изученного материала', 'Итоговый урок', 'Практическое занятие', 'Лабораторная работа', 'Самостоятельная работа'];
  const HW_POOL = ['Упражнения по теме урока', 'Подготовить конспект', 'Решить задачи из учебника', 'Повторить пройденный материал', 'Подготовиться к контрольной работе', 'Составить таблицу', 'Прочитать параграф'];
  let schWeek = 0, schDay = ((new Date().getDay() + 6) % 7) % 5; // текущий будний день

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function lcg(seed) { let s = seed || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  const pick = (arr, n) => arr[n % arr.length];

  // недельное расписание группы для буднего дня (стабильное по группе+дню)
  function lessonsFor(g, dayIdx) {
    const rnd = lcg(hashStr(g.id + ':' + dayIdx));
    const n = Math.min(SCH_SLOTS.length, 4 + Math.floor(rnd() * 4)); // 4–7 уроков
    const start = Math.floor(rnd() * Math.max(1, g.disciplines.length));
    const out = [];
    for (let i = 0; i < n; i++) {
      const disc = g.disciplines[(start + i) % g.disciplines.length];
      const dh = hashStr(disc);
      out.push({
        disc, slot: SCH_SLOTS[i],
        teacher: pick(TEACHERS, dh % TEACHERS.length),
        room: 200 + (dh % 120),
      });
    }
    return out;
  }
  function mondayOf(week) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow + week * 7);
    return d;
  }

  function renderSchedule() {
    ensureSel();
    const gs = Store.groups();
    view.innerHTML = `
      <div class="toolbar">
        <div class="ctl"><label>Группа</label>
          <select id="schGroup">${gs.map(x => `<option value="${x.id}" ${x.id === sel.gid ? 'selected' : ''}>${esc(x.name)} · ${esc(x.faculty || '')}</option>`).join('')}</select></div>
        <div class="spacer"></div>
        <div class="year-pill"><span class="badge green">Активный</span> 2025–2026</div>
      </div>
      <div class="sched">
        <div class="sched-tabs">
          <button class="sched-nav" id="prevWeek">${I('arrowLeft', 16)} <span class="lbl-wk">Предыдущая неделя</span></button>
          ${SCH_DAYS.map((d, i) => `<button class="sched-tab ${i === schDay ? 'active' : ''}" data-day="${i}">${esc(d)}</button>`).join('')}
          <button class="sched-nav" id="nextWeek"><span class="lbl-wk">Следующая неделя</span> ${I('arrowRight', 16)}</button>
        </div>
        <div class="sched-body" id="schedBody"></div>
      </div>`;
    $('#schGroup').onchange = e => { sel.gid = e.target.value; const g = Store.group(sel.gid); sel.disc = g.disciplines[0]; drawSchedule(); };
    $('#prevWeek').onclick = () => { schWeek--; drawSchedule(); };
    $('#nextWeek').onclick = () => { schWeek++; drawSchedule(); };
    view.querySelectorAll('.sched-tab').forEach(t => t.onclick = () => { schDay = +t.dataset.day; renderSchedule(); });
    drawSchedule();
  }

  function drawSchedule() {
    const g = Store.group(sel.gid);
    const date = mondayOf(schWeek); date.setDate(date.getDate() + schDay);
    const iso = Store.fmt(date);
    const lessons = lessonsFor(g, schDay);
    const head = `
      <div class="sched-date">${date.getDate()} <span class="m-name">${SCH_MONTHS[date.getMonth()]}</span></div>
      <div class="sched-table-wrap">
        <table class="sched-table">
          <thead><tr>
            <th class="c-num">№</th><th>Предмет и преподаватель</th><th>Время и кабинет</th>
            <th>Тема</th><th class="c-act">Урок</th><th class="c-act">Домашнее задание</th>
          </tr></thead><tbody>`;
    const rows = lessons.map((l, i) => {
      const topic = Store.getTopic(g.id, l.disc, iso) || pick(TOPIC_POOL, hashStr(l.disc + iso) % TOPIC_POOL.length);
      const hasHw = hashStr(l.disc + iso + 'hw') % 10 > 3;
      return `<tr>
        <td class="c-num">${i + 1}</td>
        <td class="c-subj">
          <div class="s-name">${esc(l.disc)}</div>
          <div class="s-grp">${esc(g.name)}</div>
          <div class="s-teacher">${I('users', 13)} ${esc(l.teacher)}</div>
        </td>
        <td class="c-time"><b>${l.slot[0]} – ${l.slot[1]}</b><span><span class="rm">каб.</span> ${l.room}</span></td>
        <td class="c-topic">${esc(topic)}</td>
        <td class="c-act"><button class="btn-go" data-disc="${esc(l.disc)}">Перейти</button></td>
        <td class="c-act"><button class="btn-show" data-hw="${hasHw ? esc(pick(HW_POOL, hashStr(l.disc + iso) % HW_POOL.length)) : ''}" data-disc="${esc(l.disc)}">Показать</button></td>
      </tr>`;
    }).join('');
    const empty = `<tr><td colspan="6"><div class="empty-state"><div class="big">${I('calendar', 50)}</div>На этот день уроков нет</div></td></tr>`;
    $('#schedBody').innerHTML = head + (lessons.length ? rows : empty) + `</tbody></table></div>`;

    // переход в журнал по уроку
    $('#schedBody').querySelectorAll('.btn-go').forEach(b => b.onclick = () => {
      sel.disc = b.dataset.disc; location.hash = '#/journal';
    });
    // показать домашнее задание
    $('#schedBody').querySelectorAll('.btn-show').forEach(b => b.onclick = () => {
      const hw = b.dataset.hw;
      modal('Домашнее задание', `
        <p class="muted" style="margin-bottom:6px">${esc(b.dataset.disc)}</p>
        ${hw ? `<p style="font-size:15px;color:var(--ink)">${esc(hw)}</p>` : `<div class="empty-state" style="padding:30px"><div class="big">${I('search', 46)}</div>Домашнее задание не задано</div>`}`,
        `<button class="btn soft" onclick="App.closeModal()">Закрыть</button>`);
    });
    if (window.I18n) I18n.apply($('#schedBody'));
    // подсветить активную вкладку дня
    view.querySelectorAll('.sched-tab').forEach((t, i) => t.classList.toggle('active', i === schDay));
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

  // авто-заполнение оценками включено, пока его явно не отключили
  const autoFillOn = () => Store.settings().autoFillGrades !== false;

  // генерация реалистичных оценок для группы/дисциплины (демо-заполнение)
  function genGrades(gid, disc) {
    const g = Store.group(gid);
    const dates = Store.datesFor(gid, disc);
    Store.batch(() => {
      g.students.forEach((_, si) => {
        const ability = 0.45 + Math.random() * 0.55; // «уровень» студента (стабильный по строке)
        dates.forEach(d => {
          const rnd = Math.random();
          if (rnd < 0.05) { Store.setMark(gid, disc, d, si, 'Н'); return; } // ~5% отсутствий
          if (rnd < 0.22) return;                                          // ~17% ячеек пустые
          const x = ability * 0.7 + Math.random() * 0.3;
          const v = x > 0.82 ? '5' : x > 0.55 ? '4' : x > 0.3 ? '3' : '2';
          Store.setMark(gid, disc, d, si, v);
        });
      });
    });
  }

  // предзаполнить первую дисциплину каждой группы (для карточек групп и графиков)
  function ensureAllGrades() {
    if (!autoFillOn()) return;
    Store.batch(() => {
      Store.groups().forEach(g => {
        const disc = g.disciplines[0];
        if (disc && !Store.hasMarks(g.id, disc)) genGrades(g.id, disc);
      });
    });
  }

  function renderJournal() {
    ensureSel();
    // ленивое авто-заполнение оценками (включено по умолчанию)
    if (autoFillOn() && !Store.hasMarks(sel.gid, sel.disc)) genGrades(sel.gid, sel.disc);
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
          <button class="btn ghost sm" id="fillBtn">${I('pencil', 16)} Заполнить оценками</button>
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
    $('#fillBtn').onclick = () => {
      if (Store.hasMarks(sel.gid, sel.disc) && !confirm('В этом журнале уже есть оценки. Перезаполнить новыми?')) return;
      genGrades(sel.gid, sel.disc); drawGrid(); toast('Журнал заполнен оценками', 'ok');
    };
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
        <td class="col-name"><div class="namecell"><span class="avatar-sm">${esc(initials(st.fio))}</span><span class="sname" data-full="${esc(st.fio)}">${esc(st.fio)}</span></div></td>`;
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
  let grpFilter = '', grpFac = '';
  function renderGroups() {
    ensureAllGrades();
    const all = Store.groups();
    const faculties = [...new Set(all.map(g => g.faculty).filter(Boolean))].sort();
    view.innerHTML = `
      <div class="toolbar">
        <div class="ctl"><label>Поиск группы</label>
          <input id="grpSearch" placeholder="Название, факультет, кафедра..." value="${esc(grpFilter)}" style="min-width:260px"></div>
        <div class="ctl"><label>Факультет</label>
          <select id="grpFac"><option value="">Все факультеты</option>
            ${faculties.map(f => `<option value="${esc(f)}" ${f === grpFac ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
        <div class="spacer"></div>
        <div class="ctl"><label>&nbsp;</label><span class="badge gray" id="grpCount" style="padding:9px 13px"></span></div>
      </div>
      <div class="gcards" id="gc"></div>`;

    const draw = () => {
      const f = grpFilter.toLowerCase().trim();
      const list = all.filter(g =>
        (!grpFac || g.faculty === grpFac) &&
        (!f || (g.name + ' ' + (g.faculty || '') + ' ' + (g.dept || '')).toLowerCase().includes(f)));
      $('#grpCount').textContent = `Найдено: ${list.length} из ${all.length}`;
      const gc = $('#gc');
      gc.innerHTML = '';
      if (!list.length) { gc.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="big">${I('search', 50)}</div>Группы не найдены</div>`; return; }
      list.forEach(g => {
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
    };
    $('#grpSearch').oninput = e => { grpFilter = e.target.value; draw(); };
    $('#grpFac').onchange = e => { grpFac = e.target.value; draw(); };
    draw();
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
    $('#bars').innerHTML = bar('Успеваемость', s.success, '#138a5b') + bar('Качество знаний', s.quality, '#bd7a14')
      + bar('Посещаемость', s.attendance, '#0e8f86') + bar('Заполнение журнала', Math.min(s.count / (g.students.length * Store.datesFor(sel.gid, sel.disc).length || 1) * 100, 100), '#1f4fd0');

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
        data: { labels: labels.map(l => l.length > 18 ? l.slice(0, 16) + '…' : l), datasets: [{ data, backgroundColor: '#1f4fd0', borderRadius: 5 }] },
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
            <p class="muted" style="margin-bottom:14px">Загрузите <b>отчёт по журналам</b> (создаст группы и дисциплины) или <b>таблицу с оценками</b> (расставит оценки по ФИО). Формат — .xlsx или .csv.</p>
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
      <div class="panel"><div class="panel-head"><h3>Какие файлы можно загружать</h3></div>
        <div class="panel-body">
          <p class="muted" style="margin-bottom:10px"><b>1. Отчёт по электронным журналам</b> (как в BilimClass) — со столбцами
          <code>Группа</code>, <code>Дисциплина</code>, <code>Количество обучающихся</code>.
          Приложение само создаст все группы, дисциплины и списки студентов — журнал заполнится автоматически.</p>
          <p class="muted"><b>2. Таблица журнала с оценками</b> — строка заголовка
          <code>№ | ФИО студента | даты (01.09, …) | Средний балл</code>. Оценки (2–5 или «Н») расставятся
          по студентам выбранной группы. Строка <b>«Тема урока →»</b> загружает темы.</p>
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
      // --- загрузка структуры журнала (группы/дисциплины/студенты) ---
      if (r.kind === 'structure') {
        modal('Загрузить структуру журнала?', `
          <p class="muted">В файле распознан отчёт по электронным журналам. Будет создана структура:</p>
          <div class="cards" style="margin:14px 0 0">
            ${stat('bg-blue', 'school', r.count, 'Учебных групп', 'up', 'групп')}
            ${stat('bg-green', 'users', r.students, 'Студентов', 'up', 'всего')}
            ${stat('bg-amber', 'book', r.disciplines, 'Дисциплин', 'up', 'предметов')}
          </div>
          <label class="fillopt"><input type="checkbox" id="optFill" checked> Заполнить журнал демонстрационными оценками</label>
          <p class="muted mt" style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--gold);flex-shrink:0">${I('alert', 16)}</span> Текущие группы и введённые оценки будут заменены новой структурой.</p>`,
          `<button class="btn soft" onclick="App.closeModal()">Отмена</button>
           <button class="btn" id="applyStruct">Заполнить журнал</button>`);
        $('#applyStruct').onclick = () => {
          const withGrades = $('#optFill').checked;
          Store.setGroups(r.groups);
          Store.setSetting('autoFillGrades', withGrades);
          sel.gid = null; sel.disc = null; ensureSel();
          if (withGrades) genGrades(sel.gid, sel.disc); // сразу заполнить первый журнал
          closeModal();
          toast('Журнал заполнен: ' + r.count + ' групп' + (withGrades ? ' с оценками' : ''), 'ok');
          location.hash = '#/journal'; router();
        };
        return;
      }
      if (r.imported === 0) {
        const reason = r.dates === 0
          ? 'В файле не найдены колонки с датами уроков. Заголовок должен содержать даты в формате <b>01.09</b> между «ФИО студента» и «Средний балл».'
          : r.matched === 0
            ? 'Ни один студент не совпал по ФИО с выбранной группой. Проверьте, что вы загружаете журнал в ту же группу, из которой он был выгружен, и что ФИО во 2-й колонке совпадают.'
            : 'Ячейки с оценками пустые — заполните оценки (2–5 или «Н») в файле и загрузите снова.';
        modal('Оценки не загружены', `
          <p class="muted">${reason}</p>
          <p class="muted mt">Распознано: дат — <b>${r.dates}</b>, студентов сопоставлено — <b>${r.matched}</b> из ${r.students}.</p>
          <p class="muted mt">Совет: сначала нажмите «Скачать Excel», заполните оценки в этом же файле и загрузите его обратно.</p>`,
          `<button class="btn soft" onclick="App.closeModal()">Понятно</button>`);
        toast('Импорт: 0 оценок — проверьте файл', 'err');
        return;
      }
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
            <div class="kv"><span>Источник структуры</span><b>${Store.isCustomGroups() ? 'загружена из файла' : 'стандартная'}</b></div>
            <hr style="border:none;border-top:1px solid var(--line);margin:16px 0">
            <p class="muted" style="margin-bottom:10px">Опасная зона:</p>
            <div class="flex wrap">
              ${Store.isCustomGroups() ? `<button class="btn soft sm" id="resetStructBtn">${I('rotate', 16)} Вернуть стандартную структуру</button>` : ''}
              <button class="btn soft sm" id="resetBtn" style="color:var(--c-red)">${I('trash', 16)} Очистить все оценки и темы</button>
            </div>
          </div></div>
      </div>`;
    $('#saveProfile').onclick = () => {
      Store.setUser({ ...u, name: $('#setName').value, subject: $('#setSubj').value });
      paintUser(); toast('Профиль сохранён', 'ok');
    };
    $('#resetStructBtn') && ($('#resetStructBtn').onclick = () => {
      if (confirm('Вернуть стандартную структуру групп? Загруженная из файла структура и оценки будут удалены.')) {
        Store.resetGroups(); sel.gid = null; sel.disc = null; ensureSel();
        toast('Структура сброшена', 'ok'); renderSettings();
      }
    });
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
    if (!location.hash) location.hash = '#/schedule';
    router();
  }

  // живые часы в боковой панели
  function startClock() {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const mon = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const p = n => String(n).padStart(2, '0');
    const upd = () => {
      const d = new Date();
      const t = $('#clkTime'), dt = $('#clkDate');
      if (t) t.textContent = p(d.getHours()) + ':' + p(d.getMinutes());
      if (dt) dt.textContent = days[d.getDay()] + ', ' + d.getDate() + ' ' + mon[d.getMonth()];
    };
    upd(); clearInterval(window.__clk); window.__clk = setInterval(upd, 15000);
  }

  function bootstrap() {
    Store.init();
    // цвета графиков под светлую тему
    if (window.Chart) {
      Chart.defaults.color = '#727c93';
      Chart.defaults.borderColor = '#e3e7f0';
      Chart.defaults.font.family = "'Inter','Segoe UI',sans-serif";
    }
    // авто-вход, если уже логинились
    if (Store.user()) showApp();

    $('#loginForm').addEventListener('submit', e => {
      e.preventDefault();
      const email = $('#liEmail').value.trim(), pass = $('#liPass').value;
      if (!/.+@.+\..+/.test(email)) { toast('Введите корректный email', 'err'); return; }
      if (pass !== '1234') { toast('Неверный пароль (демо: 1234)', 'err'); return; }
      Store.setUser({ name: 'Преподаватель', email, login: email });
      showApp(); toast('Добро пожаловать!', 'ok');
    });
    // показать/скрыть пароль
    $('#togglePass') && $('#togglePass').addEventListener('click', () => {
      const inp = $('#liPass'), show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $('#togglePass').innerHTML = I(show ? 'eyeOff' : 'eye', 18);
    });
    $('#forgotLink') && $('#forgotLink').addEventListener('click', ev => {
      ev.preventDefault();
      toast('Для восстановления доступа обратитесь к администратору колледжа', 'info');
    });
    const logout = () => { Store.setUser(null); location.reload(); };
    $('#logoutBtn') && $('#logoutBtn').addEventListener('click', logout);
    $('#logoutBtn2') && $('#logoutBtn2').addEventListener('click', logout);
    // гамбургер: на мобильном — выезжающее меню, на десктопе — свернуть панель
    $('#hamb').addEventListener('click', () => {
      if (window.matchMedia('(max-width:860px)').matches) {
        const open = $('#sidebar').classList.toggle('open');
        $('#sbBackdrop').classList.toggle('show', open);
      } else {
        $('#app').classList.toggle('nav-collapsed');
      }
    });
    $('#sbBackdrop').addEventListener('click', closeSidebar);
    // меню пользователя (выпадающее)
    const um = $('#userMenu');
    um && um.addEventListener('click', e => {
      if (e.target.closest('a') || e.target.closest('#logoutBtn')) return;
      e.stopPropagation(); um.classList.toggle('open');
    });
    document.addEventListener('click', () => um && um.classList.remove('open'));
    // уведомления (демо)
    $('#notifBtn') && $('#notifBtn').addEventListener('click', () => toast('Новых уведомлений нет', 'info'));
    // живые часы в боковой панели
    startClock();
    // переключатель языков (RU / KZ / EN) — реальная смена языка
    const LMAP = { RU: 'ru', KZ: 'kk', EN: 'en' };
    if ($('#langs')) {
      // отметить активный по сохранённому языку
      const cur = window.I18n ? I18n.getLang() : 'ru';
      $('#langs').querySelectorAll('button').forEach(b => b.classList.toggle('active', LMAP[b.textContent.trim()] === cur));
      $('#langs').addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON' || !window.I18n) return;
        const code = LMAP[e.target.textContent.trim()] || 'ru';
        I18n.setLang(code);
        $('#langs').querySelectorAll('button').forEach(b => b.classList.toggle('active', b === e.target));
        router();                 // перерисовать текущий экран
        I18n.apply(document.body); // и весь каркас
        document.documentElement.lang = code;
      });
    }
    window.addEventListener('hashchange', router);

    // всплывающая подсказка с полным ФИО при наведении
    const tip = document.createElement('div');
    tip.className = 'tip'; document.body.appendChild(tip);
    document.addEventListener('mouseover', e => {
      const el = e.target.closest && e.target.closest('.sname');
      if (!el || !el.dataset.full) { tip.classList.remove('show'); return; }
      tip.textContent = el.dataset.full;
      tip.classList.add('show');
      const r = el.getBoundingClientRect();
      let left = r.left;
      if (left + tip.offsetWidth > window.innerWidth - 8) left = window.innerWidth - tip.offsetWidth - 8;
      tip.style.left = Math.max(8, left) + 'px';
      tip.style.top = (r.top - 6) + 'px';
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest && e.target.closest('.sname')) tip.classList.remove('show');
    });

    // первоначальный перевод интерфейса (вход + каркас)
    if (window.I18n) { document.documentElement.lang = I18n.getLang(); I18n.apply(document.body); }
  }

  // публичный API для inline-обработчиков
  window.App = { closeModal };

  bootstrap();
})();
