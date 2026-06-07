/* ===== icons.js — линейные SVG-иконки (стиль Lucide), монохром currentColor ===== */
window.Icons = (() => {
  const P = {
    home:        '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/>',
    table:       '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M12 3v18"/>',
    book:        '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    check:       '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
    users:       '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    school:      '<path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M12 2 2 7l10 5 10-5z"/><path d="M6 11v5M18 11v5"/>',
    chart:       '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    swap:        '<path d="m17 3 4 4-4 4"/><path d="M21 7H7"/><path d="m7 21-4-4 4-4"/><path d="M3 17h14"/>',
    settings:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.2 9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    logout:      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    search:      '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    download:    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload:      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    plus:        '<path d="M12 5v14M5 12h14"/>',
    fileText:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/>',
    sheet:       '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M12 13v4"/>',
    folder:      '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    rotate:      '<path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>',
    trash:       '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    target:      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    star:        '<path d="M12 2 15 8.5 22 9.3l-5 4.6 1.2 6.9L12 17.6 5.8 20.8 7 13.9 2 9.3 9 8.5z"/>',
    pencil:      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    x:           '<path d="M18 6 6 18M6 6l12 12"/>',
    info:        '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert:       '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    trendUp:     '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    save:        '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    open:        '<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="M6 4 2 8l4 4"/>',
    dot:         '<circle cx="12" cy="12" r="3"/>',
  };
  const svg = (name, size = 20) => {
    const p = P[name] || P.dot;
    return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  };
  const render = (root = document) => {
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.done) return;
      el.innerHTML = svg(el.dataset.icon, +el.dataset.size || 20);
      el.dataset.done = '1';
    });
  };
  document.addEventListener('DOMContentLoaded', () => render());
  return { svg, render, P };
})();
