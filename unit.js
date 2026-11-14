/* 本课全部：列表 + 搜索 */
(function () {
  var book = window.RU_WORDS_BOOK;
  var R = window.RWC;
  var state = R.load();

  var m = /[?&]lesson=(\d+)/.exec(location.search);
  var lesson = m ? parseInt(m[1], 10) : book.lessons[0].n;

  var picker = '<select id="lp" aria-label="选择课次">';
  book.lessons.forEach(function (l) {
    picker += '<option value="' + l.n + '"' + (l.n === lesson ? ' selected' : '') + '>第 ' + l.n + ' 课 · ' + l.count + ' 词</option>';
  });
  picker += '</select>';
  document.getElementById('lessonPicker').innerHTML = picker;

  document.getElementById('unitTitle').textContent = '第 ' + lesson + ' 课 · ' + R.lessonTitle(book, lesson);
  document.getElementById('studyLink').href = 'study.html?lesson=' + lesson;

  var items = book.items.filter(function (it) { return it.l === lesson; });
  var html = '';
  items.forEach(function (it) {
    var c = state.cards[it.id];
    var cls = !c || c.r === 0 ? '' : (R.isDone(c) ? 'ok' : 'learn');
    var meta = [it.pos, it.gender ? it.gender + '性' : '', it.gov ? '接 ' + it.gov : ''].filter(Boolean).join(' · ');
    html += '<div class="row" data-ru="' + R.esc(R.plainRu(it.ru).toLowerCase()) + '" data-zh="' + R.esc((it.zh || '').toLowerCase()) + '">' +
      '<span class="dot ' + cls + '"></span>' +
      '<span class="ru">' + R.ruHTML(it.ru) + '</span>' +
      '<span class="zh">' + R.esc(it.zh) + '</span>' +
      '<span class="meta">' + R.esc(meta) + '</span>' +
      '</div>';
  });
  var wrap = document.getElementById('words');
  wrap.innerHTML = html || '<div class="empty">这一课没有词条</div>';

  var q = document.getElementById('q');
  var qc = document.getElementById('qCount');
  var rows = Array.prototype.slice.call(wrap.querySelectorAll('.row'));

  function updateCount(shown) {
    qc.textContent = shown === rows.length ? (rows.length + ' 词') : (shown + ' / ' + rows.length);
  }
  updateCount(rows.length);

  q.addEventListener('input', function () {
    var ql = q.value.trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (row) {
      var hit = !ql || row.getAttribute('data-ru').indexOf(ql) !== -1 || row.getAttribute('data-zh').indexOf(ql) !== -1;
      row.classList.toggle('hidden', !hit);
      if (hit) shown += 1;
    });
    updateCount(shown);
  });

  document.getElementById('lessonPicker').addEventListener('change', function (e) {
    location.href = 'unit.html?lesson=' + e.target.value;
  });
})();
