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

  // ── 导出 / 导入进度 ──
  var hint = document.getElementById('ioHint');

  function say(msg, bad) {
    hint.textContent = msg;
    hint.className = 'io-hint' + (bad ? ' err' : '');
    if (msg) setTimeout(function () { if (hint.textContent === msg) hint.textContent = ''; }, 6000);
  }

  document.getElementById('exportBtn').addEventListener('click', function () {
    var payload = {
      app: 'ru-word-cards',
      version: 1,
      book: book.id,
      exportedAt: new Date().toISOString(),
      state: state
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ru-word-cards-' + R.dayKey(R.today()) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    say('已导出 ' + c.total + ' 词的进度');
  });

  var fileInput = document.getElementById('fileInput');
  document.getElementById('importBtn').addEventListener('click', function () { fileInput.click(); });

  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(String(fr.result));
        var st = data && data.state ? data.state : data;
        if (!st || typeof st !== 'object' || typeof st.cards !== 'object') throw new Error('文件里没有进度数据');
        if (data.book && book.id && data.book !== book.id) throw new Error('这份进度属于另一本词书');
        if (!confirm('导入会覆盖本机当前进度，继续？')) return;
        st.days = st.days || {};
        st.streak = st.streak || { n: 0, last: 0 };
        if (!st.newPerDay) st.newPerDay = 20;
        R.save(st);
        location.reload();
      } catch (e) {
        say('导入失败：' + e.message, true);
      }
    };
    fr.readAsText(f);
    fileInput.value = '';
  });
})();
