/* 书首页：封面统计 + 12 课进度 */
(function () {
  var book = window.RU_WORDS_BOOK;
  var R = window.RWC;
  var state = R.load();

  var byLesson = {};
  book.items.forEach(function (it) {
    var rec = byLesson[it.l] || (byLesson[it.l] = { total: 0, done: 0, learn: 0 });
    rec.total += 1;
    var c = state.cards[it.id];
    if (c && c.r > 0) {
      if (R.isDone(c)) rec.done += 1; else rec.learn += 1;
    }
  });

  var c = R.counts(book, state);
  document.getElementById('sTotal').textContent = c.total;
  document.getElementById('sDone').textContent = c.done;
  document.getElementById('sDue').textContent = c.due;
  document.getElementById('sStreak').textContent = state.streak.n || 0;
  document.getElementById('coverCount').textContent = c.total;
  document.getElementById('lessonCount').textContent = book.lessons.length + ' 课 · ' + c.total + ' 词';

  var html = '';
  book.lessons.forEach(function (l) {
    var rec = byLesson[l.n] || { total: l.count, done: 0, learn: 0 };
    var pct = rec.total ? Math.round((rec.done / rec.total) * 100) : 0;
    html += '<a class="unit-row" href="unit.html?lesson=' + l.n + '">' +
      '<span class="unit-no">' + String(l.n).padStart(2, '0') + '</span>' +
      '<span><span class="unit-title">' + R.esc(l.title || ('第 ' + l.n + ' 课')) + '</span>' +
      '<span class="unit-sub">学习中 ' + rec.learn + ' · 未学 ' + (rec.total - rec.done - rec.learn) + '</span></span>' +
      '<span class="unit-progress">' +
        '<span class="unit-progress-line"><span>已掌握</span><b>' + rec.done + ' / ' + rec.total + '</b></span>' +
        '<span class="bar"><span style="width:' + pct + '%"></span></span>' +
      '</span>' +
      '<span class="unit-count">' + l.count + '<span>词</span></span>' +
      '<span class="unit-arrow">›</span>' +
      '</a>';
  });
  document.getElementById('units').innerHTML = html;
})();
