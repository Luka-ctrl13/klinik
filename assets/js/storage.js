/* ===== storage.js — слой данных журнала (localStorage) ===== */
const Store = (() => {
  const KEY = 'bilimjournal.v1';
  let state = null;

  // ---- генерация дат уроков (учебный год, будни) ----
  function genLessonDates(count = 24, start = '2025-09-01') {
    const dates = [];
    let d = new Date(start);
    while (dates.length < count) {
      const wd = d.getDay();
      if (wd !== 0 && wd !== 6) dates.push(fmt(d)); // без выходных
      d.setDate(d.getDate() + 2); // ~через урок
    }
    return dates;
  }
  function fmt(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function init() {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try { state = JSON.parse(raw); } catch (e) { state = null; }
    }
    if (!state) {
      state = {
        marks: {},      // "groupId|disc|date|studentIdx" -> "5" | "Н" | ...
        topics: {},     // "groupId|disc|date" -> "Тема урока"
        dates: {},      // "groupId|disc" -> [dates]
        user: null,
        settings: { markScale: '5', theme: 'light' }
      };
      save();
    }
    // группы: либо загруженная пользователем структура, либо seed из data.js
    state.groups = (state.customGroups && state.customGroups.length)
      ? state.customGroups
      : ((window.SEED_DATA && window.SEED_DATA.groups) || []);
    return state;
  }

  // заменить структуру журнала (группы/дисциплины/студенты) загруженной из файла
  function setGroups(groups, opts = { resetJournal: true }) {
    state.customGroups = groups;
    state.groups = groups;
    if (opts.resetJournal) { state.marks = {}; state.topics = {}; state.dates = {}; }
    save();
  }
  // вернуть исходные группы из data.js
  function resetGroups() {
    delete state.customGroups;
    state.groups = (window.SEED_DATA && window.SEED_DATA.groups) || [];
    state.marks = {}; state.topics = {}; state.dates = {};
    save();
  }
  const isCustomGroups = () => !!(state.customGroups && state.customGroups.length);

  function save() {
    const { groups, ...persist } = state; // группы не сохраняем (берём из seed)
    localStorage.setItem(KEY, JSON.stringify(persist));
  }

  // ---- группы / дисциплины / студенты ----
  const groups = () => state.groups;
  const group = id => state.groups.find(g => g.id === id);

  function datesFor(gid, disc) {
    const k = gid + '|' + disc;
    if (!state.dates[k]) { state.dates[k] = genLessonDates(); save(); }
    return state.dates[k];
  }
  function addDate(gid, disc, date) {
    const arr = datesFor(gid, disc);
    if (!arr.includes(date)) { arr.push(date); arr.sort(); save(); }
  }
  function removeDate(gid, disc, date) {
    const k = gid + '|' + disc;
    state.dates[k] = datesFor(gid, disc).filter(d => d !== date);
    save();
  }

  // ---- оценки ----
  const mKey = (gid, disc, date, si) => [gid, disc, date, si].join('|');
  const getMark = (gid, disc, date, si) => state.marks[mKey(gid, disc, date, si)] || '';
  function setMark(gid, disc, date, si, val) {
    const k = mKey(gid, disc, date, si);
    if (val === '' || val == null) delete state.marks[k];
    else state.marks[k] = String(val);
    save();
  }

  // ---- темы ----
  const tKey = (gid, disc, date) => [gid, disc, date].join('|');
  const getTopic = (gid, disc, date) => state.topics[tKey(gid, disc, date)] || '';
  function setTopic(gid, disc, date, txt) {
    const k = tKey(gid, disc, date);
    if (!txt) delete state.topics[k]; else state.topics[k] = txt;
    save();
  }

  // ---- статистика ----
  function studentAvg(gid, disc, si) {
    const ds = datesFor(gid, disc);
    const nums = ds.map(d => parseFloat(getMark(gid, disc, d, si)))
      .filter(v => !isNaN(v));
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
  // успеваемость и качество знаний по группе/дисциплине
  function groupStats(gid, disc) {
    const g = group(gid); if (!g) return null;
    const ds = datesFor(gid, disc);
    let all = [], absent = 0, total = 0;
    g.students.forEach((_, si) => {
      ds.forEach(d => {
        const v = getMark(gid, disc, d, si);
        if (v === 'Н' || v === 'н') absent++;
        if (v) total++;
        const n = parseFloat(v);
        if (!isNaN(n)) all.push(n);
      });
    });
    const avg = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
    const success = all.length ? all.filter(v => v >= 3).length / all.length * 100 : 0; // успеваемость
    const quality = all.length ? all.filter(v => v >= 4).length / all.length * 100 : 0; // качество знаний
    const attendance = total ? (1 - absent / total) * 100 : 100;
    return { avg, success, quality, attendance, count: all.length, absent };
  }

  // глобальная статистика для дашборда
  function globalStats() {
    let marks = 0, fives = 0, absent = 0, lessons = 0;
    let totalStudents = 0;
    groups().forEach(g => totalStudents += g.students.length);
    Object.values(state.marks).forEach(v => {
      marks++;
      if (v === '5') fives++;
      if (v === 'Н' || v === 'н') { absent++; }
    });
    lessons = Object.keys(state.topics).length;
    const nums = Object.values(state.marks).map(parseFloat).filter(v => !isNaN(v));
    const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    const quality = nums.length ? nums.filter(v => v >= 4).length / nums.length * 100 : 0;
    return {
      groups: groups().length, totalStudents,
      marks, fives, absent, lessons, avg, quality
    };
  }

  // ---- пользователь / настройки ----
  function setUser(u) { state.user = u; save(); }
  const user = () => state.user;
  function setSetting(k, v) { state.settings[k] = v; save(); }
  const settings = () => state.settings;

  // ---- сброс ----
  function resetAll() {
    localStorage.removeItem(KEY);
    state = null; init();
  }
  function exportState() {
    const { groups, ...persist } = state;
    return JSON.stringify(persist, null, 2);
  }
  function importState(json) {
    const obj = JSON.parse(json);
    Object.assign(state, obj);
    save();
  }

  return {
    init, save, groups, group, datesFor, addDate, removeDate,
    getMark, setMark, getTopic, setTopic, studentAvg, groupStats,
    globalStats, setUser, user, setSetting, settings, resetAll,
    exportState, importState, fmt, setGroups, resetGroups, isCustomGroups
  };
})();
