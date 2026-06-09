/* ===== i18n.js — локализация интерфейса: RU / KZ / EN ===== */
window.I18n = (() => {
  // Словарь: ключ = русский оригинал, значение = { kk, en }
  const D = {
    // --- навигация / сайдбар ---
    'Главная': { kk: 'Басты бет', en: 'Home' },
    'Журнал оценок': { kk: 'Бағалар журналы', en: 'Grade journal' },
    'Темы уроков': { kk: 'Сабақ тақырыптары', en: 'Lesson topics' },
    'Темы уроков (КТП)': { kk: 'Сабақ тақырыптары (КТЖ)', en: 'Lesson topics' },
    'Посещаемость': { kk: 'Сабаққа қатысу', en: 'Attendance' },
    'Контингент': { kk: 'Контингент', en: 'Students' },
    'Группы': { kk: 'Топтар', en: 'Groups' },
    'Аналитика': { kk: 'Аналитика', en: 'Analytics' },
    'Импорт / Экспорт': { kk: 'Импорт / Экспорт', en: 'Import / Export' },
    'Настройки': { kk: 'Баптаулар', en: 'Settings' },
    'Основное': { kk: 'Негізгі', en: 'Main' },
    'Данные': { kk: 'Деректер', en: 'Data' },
    'Сервис': { kk: 'Сервис', en: 'Service' },
    'Учебный портал': { kk: 'Оқу порталы', en: 'Education portal' },
    'Преподаватель': { kk: 'Оқытушы', en: 'Teacher' },
    'Выйти': { kk: 'Шығу', en: 'Log out' },

    // --- подзаголовки страниц ---
    'Обзор успеваемости и активности': { kk: 'Үлгерім мен белсенділік шолуы', en: 'Performance & activity overview' },
    'Выставление оценок по урокам': { kk: 'Сабақтар бойынша баға қою', en: 'Grading by lessons' },
    'Календарно-тематическое планирование': { kk: 'Күнтізбелік-тақырыптық жоспарлау', en: 'Calendar & thematic planning' },
    'Отметки присутствия студентов': { kk: 'Студенттердің қатысуын белгілеу', en: 'Student attendance marking' },
    'Список студентов колледжа': { kk: 'Колледж студенттерінің тізімі', en: 'College students list' },
    'Учебные группы и дисциплины': { kk: 'Оқу топтары мен пәндер', en: 'Study groups and subjects' },
    'Качество знаний и успеваемость': { kk: 'Білім сапасы мен үлгерім', en: 'Knowledge quality and performance' },
    'Выгрузка и загрузка данных журнала': { kk: 'Журнал деректерін жүктеу', en: 'Journal data import and export' },
    'Профиль и параметры системы': { kk: 'Профиль және жүйе параметрлері', en: 'Profile and system settings' },
    'Поиск студента по ФИО / ИИН...': { kk: 'Студентті аты-жөні / ЖСН бойынша іздеу...', en: 'Search student by name / IIN...' },

    // --- дашборд ---
    'Студентов в контингенте': { kk: 'Контингенттегі студенттер', en: 'Students in contingent' },
    'Учебных групп': { kk: 'Оқу топтары', en: 'Study groups' },
    'Выставлено оценок': { kk: 'Қойылған бағалар', en: 'Grades given' },
    'Средний балл': { kk: 'Орташа балл', en: 'Average grade' },
    'Качество знаний': { kk: 'Білім сапасы', en: 'Knowledge quality' },
    'оценки 4–5': { kk: '4–5 бағалар', en: 'grades 4–5' },
    'журнал': { kk: 'журнал', en: 'journal' },
    'Динамика средних баллов по группам': { kk: 'Топтар бойынша орташа балл динамикасы', en: 'Average grades by group' },
    'Распределение оценок': { kk: 'Бағалардың таралуы', en: 'Grade distribution' },
    'Быстрый доступ к группам': { kk: 'Топтарға жылдам қол жеткізу', en: 'Quick access to groups' },
    'Открыть журнал →': { kk: 'Журналды ашу →', en: 'Open journal →' },
    'студентов': { kk: 'студент', en: 'students' },
    'дисциплин': { kk: 'пән', en: 'subjects' },
    'ср. балл': { kk: 'орт. балл', en: 'avg.' },
    'Отлично (5)': { kk: 'Өте жақсы (5)', en: 'Excellent (5)' },
    'Хорошо (4)': { kk: 'Жақсы (4)', en: 'Good (4)' },
    'Удовл. (3)': { kk: 'Қанағат. (3)', en: 'Satisfactory (3)' },
    'Неуд. (2)': { kk: 'Қанағ-сыз (2)', en: 'Poor (2)' },

    // --- журнал ---
    'Группа': { kk: 'Топ', en: 'Group' },
    'Дисциплина': { kk: 'Пән', en: 'Subject' },
    'Заполнить оценками': { kk: 'Бағалармен толтыру', en: 'Fill with grades' },
    'Урок': { kk: 'Сабақ', en: 'Lesson' },
    '— отсутствовал': { kk: '— болмады', en: '— absent' },
    'Введите оценку (2–5) или «Н» (отсутствие). Данные сохраняются автоматически. Клик по дате — удалить урок.':
      { kk: 'Бағаны (2–5) немесе «Н» (болмады) енгізіңіз. Деректер автоматты сақталады. Күнді басу — сабақты жою.',
        en: 'Enter a grade (2–5) or “Н” (absent). Data saves automatically. Click a date to delete the lesson.' },
    'Студент': { kk: 'Студент', en: 'Student' },
    'Ср.': { kk: 'Орт.', en: 'Avg' },
    'Добавить урок': { kk: 'Сабақ қосу', en: 'Add lesson' },
    'Дата урока': { kk: 'Сабақ күні', en: 'Lesson date' },
    'Тема урока (необязательно)': { kk: 'Сабақ тақырыбы (міндетті емес)', en: 'Lesson topic (optional)' },
    'Отмена': { kk: 'Болдырмау', en: 'Cancel' },
    'Добавить': { kk: 'Қосу', en: 'Add' },

    // --- темы ---
    'Уроки ещё не запланированы': { kk: 'Сабақтар әлі жоспарланбаған', en: 'No lessons planned yet' },

    // --- посещаемость ---
    'Отметка посещаемости': { kk: 'Қатысуды белгілеу', en: 'Attendance marking' },
    'Все присутствуют': { kk: 'Барлығы бар', en: 'All present' },
    'Статус': { kk: 'Күй', en: 'Status' },
    'Присутствует': { kk: 'Бар', en: 'Present' },
    'Отсутствует': { kk: 'Жоқ', en: 'Absent' },

    // --- контингент ---
    'Поиск': { kk: 'Іздеу', en: 'Search' },
    'ФИО или ИИН...': { kk: 'Аты-жөні немесе ЖСН...', en: 'Name or IIN...' },
    'Экспорт контингента (Excel)': { kk: 'Контингентті экспорттау (Excel)', en: 'Export contingent (Excel)' },
    'ФИО': { kk: 'Аты-жөні', en: 'Full name' },
    'ИИН': { kk: 'ЖСН', en: 'IIN' },
    'Дата рожд.': { kk: 'Туған күні', en: 'Birth date' },
    'Пол': { kk: 'Жынысы', en: 'Gender' },
    'Специальность': { kk: 'Мамандық', en: 'Specialty' },
    'Назад': { kk: 'Артқа', en: 'Back' },
    'Вперёд': { kk: 'Алға', en: 'Next' },
    'Ничего не найдено': { kk: 'Ештеңе табылмады', en: 'Nothing found' },

    // --- группы ---
    'Поиск группы': { kk: 'Топты іздеу', en: 'Search group' },
    'Название, факультет, кафедра...': { kk: 'Атауы, факультет, кафедра...', en: 'Name, faculty, department...' },
    'Факультет': { kk: 'Факультет', en: 'Faculty' },
    'Все факультеты': { kk: 'Барлық факультеттер', en: 'All faculties' },
    'Группы не найдены': { kk: 'Топтар табылмады', en: 'No groups found' },

    // --- аналитика ---
    'Успеваемость': { kk: 'Үлгерім', en: 'Performance' },
    'группа': { kk: 'топ', en: 'group' },
    'присут.': { kk: 'қатысу', en: 'attend.' },
    'Качество знаний по дисциплинам': { kk: 'Пәндер бойынша білім сапасы', en: 'Knowledge quality by subject' },
    'Показатели группы': { kk: 'Топ көрсеткіштері', en: 'Group metrics' },
    'Заполнение журнала': { kk: 'Журналды толтыру', en: 'Journal completion' },
    'Место': { kk: 'Орын', en: 'Rank' },
    'Уровень': { kk: 'Деңгей', en: 'Level' },
    'Отличник': { kk: 'Үздік', en: 'Excellent' },
    'Хорошист': { kk: 'Жақсы оқушы', en: 'Good' },
    'Удовл.': { kk: 'Қанағат.', en: 'Satisf.' },
    'Слабо': { kk: 'Әлсіз', en: 'Weak' },
    'Нет оценок для рейтинга': { kk: 'Рейтинг үшін баға жоқ', en: 'No grades for rating' },

    // --- импорт/экспорт ---
    'Выгрузка журнала': { kk: 'Журналды жүктеп алу', en: 'Export journal' },
    'Загрузка журнала': { kk: 'Журналды жүктеу', en: 'Import journal' },
    'Скачать Excel (.xlsx)': { kk: 'Excel жүктеу (.xlsx)', en: 'Download Excel (.xlsx)' },
    'Скачать CSV': { kk: 'CSV жүктеу', en: 'Download CSV' },
    'Прочие выгрузки:': { kk: 'Басқа жүктеулер:', en: 'Other exports:' },
    'Контингент студентов (Excel)': { kk: 'Студенттер контингенті (Excel)', en: 'Students contingent (Excel)' },
    'Резервная копия (JSON)': { kk: 'Сақтық көшірме (JSON)', en: 'Backup (JSON)' },
    'Перетащите файл сюда': { kk: 'Файлды осында сүйреңіз', en: 'Drag a file here' },
    'или нажмите, чтобы выбрать (.xlsx, .csv)': { kk: 'немесе таңдау үшін басыңыз (.xlsx, .csv)', en: 'or click to choose (.xlsx, .csv)' },
    'Восстановление из резервной копии:': { kk: 'Сақтық көшірмеден қалпына келтіру:', en: 'Restore from backup:' },
    'Загрузить JSON-копию': { kk: 'JSON көшірмесін жүктеу', en: 'Load JSON backup' },
    'Какие файлы можно загружать': { kk: 'Қандай файлдарды жүктеуге болады', en: 'Which files can be uploaded' },

    // --- настройки ---
    'Профиль преподавателя': { kk: 'Оқытушы профилі', en: 'Teacher profile' },
    'Система': { kk: 'Жүйе', en: 'System' },
    'Предмет / кафедра': { kk: 'Пән / кафедра', en: 'Subject / department' },
    'Сохранить профиль': { kk: 'Профильді сақтау', en: 'Save profile' },
    'Система оценивания': { kk: 'Бағалау жүйесі', en: 'Grading system' },
    '5-балльная (2–5)': { kk: '5 балдық (2–5)', en: '5-point (2–5)' },
    '100-балльная': { kk: '100 балдық', en: '100-point' },
    'Групп в системе': { kk: 'Жүйедегі топтар', en: 'Groups in system' },
    'Студентов всего': { kk: 'Барлық студенттер', en: 'Total students' },
    'Источник структуры': { kk: 'Құрылым көзі', en: 'Structure source' },
    'стандартная': { kk: 'стандартты', en: 'default' },
    'загружена из файла': { kk: 'файлдан жүктелген', en: 'loaded from file' },
    'Опасная зона:': { kk: 'Қауіпті аймақ:', en: 'Danger zone:' },
    'Вернуть стандартную структуру': { kk: 'Стандартты құрылымды қайтару', en: 'Restore default structure' },
    'Очистить все оценки и темы': { kk: 'Барлық бағалар мен тақырыптарды тазалау', en: 'Clear all grades and topics' },
    'Преподаватель колледжа': { kk: 'Колледж оқытушысы', en: 'College teacher' },

    // --- логин ---
    'Актюбинский высший политехнический колледж': { kk: 'Ақтөбе жоғары политехникалық колледжі', en: 'Aktobe Higher Polytechnic College' },
    'Электронный журнал преподавателя — единая система управления учебным процессом колледжа.':
      { kk: 'Оқытушының электронды журналы — колледждің оқу процесін басқарудың бірыңғай жүйесі.',
        en: 'Teacher’s electronic journal — a unified college learning management system.' },
    'Успеваемость и оценки': { kk: 'Үлгерім және бағалар', en: 'Performance and grades' },
    'Расписание занятий': { kk: 'Сабақ кестесі', en: 'Class schedule' },
    'Объявления и новости': { kk: 'Хабарландырулар мен жаңалықтар', en: 'Announcements and news' },
    'Контроль посещаемости': { kk: 'Қатысуды бақылау', en: 'Attendance control' },
    'Вход в систему': { kk: 'Жүйеге кіру', en: 'Sign in' },
    'Введите ваш email и пароль': { kk: 'Email мен құпиясөзді енгізіңіз', en: 'Enter your email and password' },
    'Email': { kk: 'Email', en: 'Email' },
    'Пароль': { kk: 'Құпиясөз', en: 'Password' },
    'Забыли пароль?': { kk: 'Құпиясөзді ұмыттыңыз ба?', en: 'Forgot password?' },
    'Войти': { kk: 'Кіру', en: 'Sign in' },
    'Система управления учебным процессом': { kk: 'Оқу процесін басқару жүйесі', en: 'Learning management system' },
    'Показать пароль': { kk: 'Құпиясөзді көрсету', en: 'Show password' },

    // --- расписание ---
    'Расписание': { kk: 'Сабақ кестесі', en: 'Schedule' },
    'Сабақ кестесі — недельное расписание занятий': { kk: 'Сабақ кестесі — апталық сабақ кестесі', en: 'Weekly class schedule' },
    'Предыдущая неделя': { kk: 'Алдыңғы апта', en: 'Previous week' },
    'Следующая неделя': { kk: 'Келесі апта', en: 'Next week' },
    'Активный': { kk: 'Белсенді', en: 'Active' },
    'Предмет и преподаватель': { kk: 'Пән және мұғалім', en: 'Subject and teacher' },
    'Время и кабинет': { kk: 'Уақыт және кабинет', en: 'Time and room' },
    'Тема': { kk: 'Тақырып', en: 'Topic' },
    'Домашнее задание': { kk: 'Үй тапсырмасы', en: 'Homework' },
    'Перейти': { kk: 'Өту', en: 'Go' },
    'Показать': { kk: 'Көрсету', en: 'Show' },
    'Закрыть': { kk: 'Жабу', en: 'Close' },
    'Домашнее задание не задано': { kk: 'Үй тапсырмасы берілмеген', en: 'No homework assigned' },
    'На этот день уроков нет': { kk: 'Бұл күні сабақ жоқ', en: 'No lessons on this day' },
    'каб.': { kk: 'каб.', en: 'room' },
    'Понедельник': { kk: 'Дүйсенбі', en: 'Monday' },
    'Вторник': { kk: 'Сейсенбі', en: 'Tuesday' },
    'Среда': { kk: 'Сәрсенбі', en: 'Wednesday' },
    'Четверг': { kk: 'Бейсенбі', en: 'Thursday' },
    'Пятница': { kk: 'Жұма', en: 'Friday' },
    'Январь': { kk: 'Қаңтар', en: 'January' }, 'Февраль': { kk: 'Ақпан', en: 'February' },
    'Март': { kk: 'Наурыз', en: 'March' }, 'Апрель': { kk: 'Сәуір', en: 'April' },
    'Май': { kk: 'Мамыр', en: 'May' }, 'Июнь': { kk: 'Маусым', en: 'June' },
    'Июль': { kk: 'Шілде', en: 'July' }, 'Август': { kk: 'Тамыз', en: 'August' },
    'Сентябрь': { kk: 'Қыркүйек', en: 'September' }, 'Октябрь': { kk: 'Қазан', en: 'October' },
    'Ноябрь': { kk: 'Қараша', en: 'November' }, 'Декабрь': { kk: 'Желтоқсан', en: 'December' },
  };

  let lang = localStorage.getItem('bilim.lang') || 'ru';
  const orig = new WeakMap();   // текстовый узел -> оригинал (ru)
  const aorig = new WeakMap();  // элемент -> {attr: оригинал}

  function tr(s) {
    if (lang === 'ru') return s;
    const e = D[s];
    return e && e[lang] ? e[lang] : s;
  }
  function getLang() { return lang; }
  function setLang(l) { lang = l; localStorage.setItem('bilim.lang', l); }

  function txtOrig(n) { if (!orig.has(n)) orig.set(n, n.nodeValue); return orig.get(n); }
  function attrOrig(el, name) {
    let m = aorig.get(el); if (!m) { m = {}; aorig.set(el, m); }
    if (!(name in m)) m[name] = el.getAttribute(name);
    return m[name];
  }

  function apply(root) {
    root = root || document.body;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(n => {
      const tag = n.parentNode && n.parentNode.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return;
      const o = txtOrig(n); const k = o.trim();
      if (!k) return;
      const t = tr(k);
      if (t !== k || lang === 'ru') n.nodeValue = o.replace(k, t);
    });
    root.querySelectorAll('[placeholder]').forEach(el => {
      const o = attrOrig(el, 'placeholder'); if (o != null) el.placeholder = tr(o.trim());
    });
    root.querySelectorAll('[title]').forEach(el => {
      const o = attrOrig(el, 'title'); if (o != null) el.setAttribute('title', tr(o.trim()));
    });
  }

  return { tr, apply, setLang, getLang, D };
})();
