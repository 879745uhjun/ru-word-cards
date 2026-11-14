/* 本课全部 */
(function () {
  var book = window.RU_WORDS_BOOK;
  var R = window.RWC;
  var state = R.load();

  var m = /[?&]lesson=(\d+)/.exec(location.search);
  var lesson = m ? parseInt(m[1], 10) : book.lessons[0].n;

  var picker = '<select id="lp">';
  book.lessons.forEach(function (l) {
    picker += '<option value="' + l.n + '"' + (l.n === lesson ? ' selected' : '') + '>第 ' + l.n + ' 课 · ' + l.count + ' 词</option>';
  });
  picker += '</select>';
  document.getElementById('lessonPicker').innerHTML = picker;

  document.getElementById('unitTitle').textContent = '第 ' + lesson + ' 课 · ' + R.lessonTitle(book, lesson);
  document.getElementById('studyLink').href = 'index.html?lesson=' + lesson;

  var items = book.items.filter(function (it) { return it.l === lesson; });
  var html = '';
  items.forEach(function (it) {
    var c = state.cards[it.id];
    var cls = !c || c.r === 0 ? '' : (R.isDone(c) ? 'ok' : 'learn');
    html += '<div class="row">' +
      '<span class="dot ' + cls + '"></span>' +
      '<span class="ru">' + R.ruHTML(it.ru) + '</span>' +
      '<span class="zh">' + R.esc(it.zh) + '</span>' +
      '<span class="meta">' + R.esc([it.pos, it.gender ? it.gender + '性' : '', it.gov ? '接 ' + it.gov : ''].filter(Boolean).join(' · ')) + '</span>' +
      '</div>';
  });
  document.getElementById('words').innerHTML = html || '<div class="empty">这一课没有词条</div>';

  document.getElementById('lessonPicker').addEventListener('change', function (e) {
    location.href = 'unit.html?lesson=' + e.target.value;
  });
})();
