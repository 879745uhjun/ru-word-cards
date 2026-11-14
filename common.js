/* 公共模块：存储、间隔复习、俄语重音渲染 */
window.RWC = (function () {
  var KEY = 'ru-word-cards-v1';
  var DAY = 86400000;
  var ACUTE = '\u0301';

  function today() {
    var d = new Date();
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY);
  }

  function empty() {
    return { v: 1, cards: {}, days: {}, streak: { n: 0, last: 0 }, newPerDay: 20 };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return empty();
      s.cards = s.cards || {};
      s.days = s.days || {};
      s.streak = s.streak || { n: 0, last: 0 };
      if (!s.newPerDay) s.newPerDay = 20;
      return s;
    } catch (e) {
      return empty();
    }
  }

  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function cardOf(s, id) {
    if (!s.cards[id]) s.cards[id] = { e: 2.5, i: 0, d: 0, r: 0, l: 0, t: 0 };
    return s.cards[id];
  }

  // 四档评分：1 忘了 / 2 模糊 / 3 记得 / 4 轻松
  function grade(c, g, day) {
    day = day || today();
    if (g === 1) {
      c.l += 1;
      c.e = Math.max(1.3, c.e - 0.2);
      c.i = 0;
      c.d = day;
    } else {
      if (c.r === 0) {
        c.i = g === 2 ? 1 : g === 3 ? 2 : 4;
      } else {
        var f = g === 2 ? 1.2 : g === 3 ? c.e : c.e * 1.3;
        c.i = Math.max(1, Math.round(c.i * f));
        if (c.i === c.r && c.i < 1) c.i = 1;
      }
      c.d = day + c.i;
      if (g === 4) c.e = Math.min(3.0, c.e + 0.1);
      if (g === 2) c.e = Math.max(1.3, c.e - 0.05);
    }
    c.r += 1;
    c.t = Date.now();
    return c;
  }

  function isDone(c) { return c && c.i >= 21; }
  function isLearning(c) { return c && c.r > 0 && c.i < 21; }
  function isDue(c, day) { return c && c.d <= (day || today()); }

  function counts(book, s) {
    var day = today();
    var out = { total: book.items.length, done: 0, learning: 0, fresh: 0, due: 0 };
    book.items.forEach(function (it) {
      var c = s.cards[it.id];
      if (!c || c.r === 0) { out.fresh += 1; return; }
      if (isDone(c)) out.done += 1; else out.learning += 1;
      if (isDue(c, day)) out.due += 1;
    });
    return out;
  }

  // 今日队列：到期复习 → 新词（受每日上限约束）
  function buildQueue(book, s, lessonFilter) {
    var day = today();
    var due = [], fresh = [];
    book.items.forEach(function (it) {
      if (lessonFilter && it.l !== lessonFilter) return;
      var c = s.cards[it.id];
      if (!c || c.r === 0) { fresh.push(it); return; }
      if (isDue(c, day)) due.push({ it: it, c: c });
    });
    due.sort(function (a, b) { return (a.c.d - b.c.d) || (a.c.i - b.c.i); });
    var used = (s.days[day] && s.days[day].n) || 0;
    var room = Math.max(0, s.newPerDay - used);
    var picked = fresh.slice(0, room);
    return due.map(function (x) { return { it: x.it, isNew: false }; })
      .concat(picked.map(function (it) { return { it: it, isNew: true }; }));
  }

  function bumpDay(s, isNew) {
    var day = today();
    var rec = s.days[day] || (s.days[day] = { n: 0, r: 0 });
    if (isNew) rec.n += 1; else rec.r += 1;
    var last = s.streak.last;
    if (last !== day) {
      s.streak.n = last === day - 1 ? s.streak.n + 1 : 1;
      s.streak.last = day;
    }
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // "вн[е]шность" -> 重音标在 е 上（与 ru-zh-cards 写法一致）
  function ruHTML(raw) {
    return esc(raw).replace(/\[([^\]]+)\]/g, function (_, v) {
      return '<span class="accent">' + v + ACUTE + '</span>';
    });
  }

  function plainRu(raw) {
    return String(raw || '').replace(/\[([^\]]+)\]/g, '$1').replace(new RegExp(ACUTE, 'g'), '');
  }

  function posLabel(it) {
    var parts = [];
    if (it.pos) parts.push(it.pos);
    if (it.gender) parts.push(it.gender + '性');
    if (it.aspect) parts.push(it.aspect);
    if (it.kind === 'pair') parts.push('体对');
    if (it.kind === 'phrase') parts.push('词组');
    return parts;
  }

  function grammarChips(it) {
    var chips = posLabel(it).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; });
    if (it.gov) chips.push('<span class="chip">接 ' + esc(it.gov) + '</span>');
    return chips.join('');
  }

  function dayKey(day) {
    var d = new Date(day * DAY);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function lessonTitle(book, n) {
    var l = null;
    for (var i = 0; i < book.lessons.length; i++) if (book.lessons[i].n === n) l = book.lessons[i];
    return l ? l.title : ('第 ' + n + ' 课');
  }

  return {
    today: today, load: load, save: save, cardOf: cardOf, grade: grade,
    counts: counts, buildQueue: buildQueue, bumpDay: bumpDay,
    esc: esc, ruHTML: ruHTML, plainRu: plainRu,
    grammarChips: grammarChips, lessonTitle: lessonTitle,
    isDone: isDone, isLearning: isLearning, isDue: isDue, dayKey: dayKey
  };
})();
