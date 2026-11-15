/* 背诵页：方向切换、翻面、四档评分、左右键切词、错题模式 */
(function () {
  var book = window.RU_WORDS_BOOK;
  var R = window.RWC;
  var state = R.load();

  var FORMS = window.RU_WORDS_FORMS || {};
  var bankById = {};
  (book.bank || []).forEach(function (e) { bankById[e.id] = e; });

  var queue = [];
  var answered = {};
  var idx = 0;
  var revealed = false;
  var history = [];
  var lesson = 0;
  var wrongMode = false;
  var dir = 'ru';

  try { dir = localStorage.getItem('rwc-dir') || 'ru'; } catch (e) {}
  if (dir !== 'zh') dir = 'ru';

  var el = {
    tag: document.getElementById('deckTag'),
    select: document.getElementById('lessonSelect'),
    counter: document.getElementById('counter'),
    bar: document.getElementById('progressBar'),
    area: document.getElementById('cardArea'),
    grades: document.getElementById('grades'),
    prev: document.getElementById('prevBtn'),
    next: document.getElementById('nextBtn'),
    pos: document.getElementById('pagerPos'),
    today: document.getElementById('statToday'),
    due: document.getElementById('statDue'),
    done: document.getElementById('statDone'),
    streak: document.getElementById('statStreak'),
    bookTitle: document.getElementById('bookTitle'),
    dirRu: document.getElementById('dirRu'),
    dirZh: document.getElementById('dirZh')
  };

  function param(name) {
    var m = new RegExp('[?&]' + name + '=(\\d+)').exec(location.search);
    return m ? parseInt(m[1], 10) : 0;
  }

  function initSelect() {
    var html = '<option value="0">全部 ' + book.items.length + ' 词</option>';
    book.lessons.forEach(function (l) {
      html += '<option value="' + l.n + '">第 ' + l.n + ' 课 · ' + l.count + ' 词</option>';
    });
    el.select.innerHTML = html;
    el.select.value = String(lesson);
  }

  function wrongQueue() {
    var items = book.items.filter(function (it) {
      var c = state.cards[it.id];
      return c && c.l > 0;
    });
    items.sort(function (a, b) {
      var ca = state.cards[a.id], cb = state.cards[b.id];
      return (cb.l - ca.l) || (ca.t - cb.t);
    });
    return items.map(function (it) { return { it: it, isNew: false }; });
  }

  function rebuild() {
    queue = wrongMode ? wrongQueue() : R.buildQueue(book, state, lesson);
    answered = {};
    idx = 0;
    revealed = false;
    history = [];
    render();
  }

  function current() { return queue[idx] || null; }

  function answeredCount() {
    var n = 0;
    queue.forEach(function (x) { if (answered[x.it.id]) n += 1; });
    return n;
  }

  function renderStats() {
    var day = R.today();
    var rec = state.days[day] || { n: 0, r: 0 };
    var c = R.counts(book, state);
    el.today.textContent = (rec.n || 0) + (rec.r || 0);
    el.due.textContent = c.due;
    el.done.textContent = c.done;
    el.streak.textContent = state.streak.n || 0;
    el.bookTitle.textContent = book.title + ' · ' + book.items.length + ' 词';
  }

  function setGrades(on) {
    Array.prototype.forEach.call(el.grades.querySelectorAll('.grade'), function (b) {
      b.disabled = !on;
    });
  }

  function renderPager() {
    el.prev.disabled = idx <= 0;
    el.next.disabled = idx >= queue.length - 1;
    el.pos.textContent = queue.length ? (idx + 1) + ' / ' + queue.length : '— / —';
  }

  function renderDir() {
    if (el.dirRu) el.dirRu.className = dir === 'ru' ? 'active' : '';
    if (el.dirZh) el.dirZh.className = dir === 'zh' ? 'active' : '';
  }

  function renderDone() {
    var c = R.counts(book, state);
    el.tag.textContent = wrongMode ? '错题复习' : (lesson ? ('第 ' + lesson + ' 课') : '全部课程');
    el.counter.textContent = '0 / 0';
    el.bar.style.width = '100%';
    var extra = wrongMode
      ? '<p class="hint"><a href="wrong.html">← 回到错题本</a></p>'
      : '<p class="hint"><button class="grade" id="moreBtn" style="max-width:230px;flex-direction:row;gap:8px">再学 10 个新词</button></p>';
    el.area.innerHTML =
      '<p class="word" style="font-size:32px">Сегодня всё</p>' +
      '<p class="meaning">' + (wrongMode ? '错题都过完了' : '这一轮的卡片都过完了') + '</p>' +
      '<p class="hint">待复习 ' + c.due + ' 张 · 已掌握 ' + c.done + ' / ' + c.total + '</p>' + extra;
    setGrades(false);
    el.prev.disabled = true;
    el.next.disabled = true;
    el.pos.textContent = '— / —';
    var more = document.getElementById('moreBtn');
    if (more) more.addEventListener('click', function () {
      state.newPerDay += 10;
      R.save(state);
      rebuild();
    });
  }

  function render() {
    renderStats();
    renderDir();
    if (!queue.length || answeredCount() >= queue.length) { renderDone(); return; }
    var item = current();
    if (!item) { renderDone(); return; }

    var it = item.it;
    el.tag.textContent = wrongMode
      ? '错题复习 · 第 ' + it.l + ' 课'
      : '第 ' + it.l + ' 课 · ' + R.lessonTitle(book, it.l).split(' · ')[0] + (item.isNew ? ' · 新词' : '');
    el.counter.textContent = (idx + 1) + ' / ' + queue.length;
    el.bar.style.width = Math.round((answeredCount() / queue.length) * 100) + '%';

    var html = '';
    if (dir === 'ru') {
      html += '<p class="word">' + R.ruHTML(it.ru) + '</p>';
      if (it.alt && it.alt.length) {
        html += '<p class="alt">' + it.alt.map(function (a) { return R.ruHTML(a); }).join('　·　') + '</p>';
      }
    }

    if (revealed) {
      if (dir === 'zh') {
        html += '<p class="word">' + R.ruHTML(it.ru) + '</p>';
        if (it.alt && it.alt.length) {
          html += '<p class="alt">' + it.alt.map(function (a) { return R.ruHTML(a); }).join('　·　') + '</p>';
        }
      }
      html += '<p class="meaning">' + R.esc(it.zh) + '</p>';
      html += '<div class="grammar">' + R.grammarChips(it) + '</div>';
      html += R.formsHTML(FORMS[it.id]);
      var exs = (it.ex || []).map(function (id) { return bankById[id]; }).filter(Boolean);
      if (exs.length) {
        html += '<div class="examples"><div class="ex-label">例句</div>' +
          exs.map(function (e) { return '<p>' + R.exHTML(e.ru, it) + '</p>'; }).join('') +
          '</div>';
      }
      if (it.note) html += '<p class="hint">' + R.esc(it.note) + '</p>';
      html += '<p class="hint"><kbd>1</kbd> 忘了 · <kbd>2</kbd> 模糊 · <kbd>3</kbd> 记得 · <kbd>4</kbd> 轻松</p>';
    } else {
      if (dir === 'zh') {
        html += '<p class="word zh-prompt">' + R.esc(it.zh) + '</p>';
        html += '<p class="hint"><kbd>空格</kbd> 显示俄语 · <kbd>←</kbd><kbd>→</kbd> 切词</p>';
      } else {
        html += '<p class="hint"><kbd>空格</kbd> 显示释义 · <kbd>←</kbd><kbd>→</kbd> 切词</p>';
      }
    }

    el.area.innerHTML = html;
    setGrades(revealed);
    renderPager();
  }

  function reveal() {
    if (revealed || !current()) return;
    revealed = true;
    render();
  }

  function prev() {
    if (idx <= 0) return;
    idx -= 1;
    revealed = false;
    render();
  }

  function next() {
    if (idx >= queue.length - 1) return;
    idx += 1;
    revealed = false;
    render();
  }

  function nextUnanswered() {
    for (var i = 0; i < queue.length; i++) {
      var j = (idx + i) % queue.length;
      if (!answered[queue[j].it.id]) { idx = j; return true; }
    }
    return false;
  }

  function answer(g) {
    var item = current();
    if (!item || !revealed) return;
    var card = R.cardOf(state, item.it.id);
    var before = JSON.parse(JSON.stringify(card));
    R.grade(card, g);
    R.bumpDay(state, item.isNew);
    R.save(state);
    answered[item.it.id] = g;
    history.push({ id: item.it.id, before: before, idx: idx });
    revealed = false;
    if (answeredCount() < queue.length) nextUnanswered();
    render();
  }

  function undo() {
    var last = history.pop();
    if (!last) return;
    state.cards[last.id] = last.before;
    delete answered[last.id];
    R.save(state);
    idx = last.idx;
    revealed = false;
    render();
  }

  function setDir(d) {
    if (d === dir) return;
    dir = d;
    try { localStorage.setItem('rwc-dir', d); } catch (e) {}
    revealed = false;
    render();
  }

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === ' ' || k === 'Enter') { e.preventDefault(); reveal(); return; }
    if (k >= '1' && k <= '4') { e.preventDefault(); answer(parseInt(k, 10)); return; }
    if (k === 'ArrowLeft') { e.preventDefault(); prev(); return; }
    if (k === 'ArrowRight') { e.preventDefault(); next(); return; }
    if (k === 'u' || k === 'U') { e.preventDefault(); undo(); return; }
  });

  el.prev.addEventListener('click', prev);
  el.next.addEventListener('click', next);
  if (el.dirRu) el.dirRu.addEventListener('click', function () { setDir('ru'); });
  if (el.dirZh) el.dirZh.addEventListener('click', function () { setDir('zh'); });

  el.grades.addEventListener('click', function (e) {
    var btn = e.target.closest('.grade');
    if (btn && !btn.disabled) answer(parseInt(btn.getAttribute('data-g'), 10));
  });

  document.getElementById('cardArea').addEventListener('click', function (e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    reveal();
  });

  el.select.addEventListener('change', function () {
    lesson = parseInt(el.select.value, 10) || 0;
    history.replaceState(null, '', lesson ? ('?lesson=' + lesson) : location.pathname);
    rebuild();
  });

  wrongMode = /[?&]wrong=1/.test(location.search);
  if (wrongMode) {
    el.select.disabled = true;
    el.select.hidden = true;
  } else {
    lesson = param('lesson');
    initSelect();
  }
  rebuild();
})();
