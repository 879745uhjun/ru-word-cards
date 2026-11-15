/* 错题本：评级「忘了」记一次 lapse；点词条展开词形表 */
(function () {
  var book = window.RU_WORDS_BOOK;
  var R = window.RWC;
  var FORMS = window.RU_WORDS_FORMS || {};
  var state = R.load();

  var list = document.getElementById('list');
  var summary = document.getElementById('summary');
  var reviewBtn = document.getElementById('reviewBtn');
  var clearBtn = document.getElementById('clearBtn');

  function missed() {
    var out = [];
    book.items.forEach(function (it) {
      var c = state.cards[it.id];
      if (c && c.l > 0) out.push({ it: it, c: c });
    });
    out.sort(function (a, b) { return (b.c.l - a.c.l) || (a.c.t - b.c.t); });
    return out;
  }

  function when(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function render() {
    var rows = missed();
    summary.textContent = rows.length ? (rows.length + ' 个词出过错') : '还没有错题';
    reviewBtn.style.display = rows.length ? '' : 'none';
    clearBtn.style.display = rows.length ? '' : 'none';

    if (!rows.length) {
      list.innerHTML = '<div class="empty">在背诵时对某个词评「忘了」，它就会出现在这里。</div>';
      return;
    }

    var html = '';
    rows.forEach(function (row) {
      var it = row.it, c = row.c;
      var meta = [it.pos, it.gender ? it.gender + '性' : ''].filter(Boolean).join(' · ');
      var hasTable = !!FORMS[it.id];
      html += '<div class="u-item" data-id="' + it.id + '">' +
        '<div class="row wrong-row' + (hasTable ? ' expandable' : '') + '">' +
          '<span class="dot learn"></span>' +
          '<span class="ru">' + R.ruHTML(it.ru) + '</span>' +
          '<span class="zh">' + R.esc(it.zh) + '</span>' +
          '<span class="meta">错 ' + c.l + ' 次 · ' + when(c.t) + (meta ? ' · ' + R.esc(meta) : '') +
            (hasTable ? ' <span class="chev">›</span>' : '') + '</span>' +
        '</div>' +
        '<div class="row-detail" hidden></div>' +
        '</div>';
    });
    list.innerHTML = html;
  }

  list.addEventListener('click', function (e) {
    var row = e.target.closest ? e.target.closest('.row.expandable') : null;
    if (!row) return;
    var box = row.parentNode;
    var detail = box.querySelector('.row-detail');
    if (!detail.hidden) {
      detail.hidden = true;
      box.classList.remove('open');
      return;
    }
    if (!detail.innerHTML) {
      var id = box.getAttribute('data-id');
      var it = book.items.filter(function (x) { return x.id === id; })[0];
      var body = R.formsHTML(FORMS[id]);
      var exs = (it && it.ex || []).map(function (eid) {
        return (book.bank || []).filter(function (b) { return b.id === eid; })[0];
      }).filter(Boolean);
      if (exs.length) {
        body += '<div class="examples"><div class="ex-label">例句</div>' +
          exs.map(function (e) { return '<p>' + R.exHTML(e.ru, it) + '</p>'; }).join('') + '</div>';
      }
      detail.innerHTML = body || '<div class="empty" style="padding:12px 0">这个词没有词形表</div>';
    }
    detail.hidden = false;
    box.classList.add('open');
  });

  clearBtn.addEventListener('click', function () {
    var rows = missed();
    if (!rows.length) return;
    if (!confirm('清除全部 ' + rows.length + ' 个词的错题标记？只清错题计数，复习进度不受影响。')) return;
    rows.forEach(function (row) { row.c.l = 0; });
    R.save(state);
    render();
  });

  render();
})();
